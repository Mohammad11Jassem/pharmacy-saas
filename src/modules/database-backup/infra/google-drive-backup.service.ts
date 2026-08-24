import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

interface GoogleOAuthCredentials {
  installed?: GoogleOAuthClient;
  web?: GoogleOAuthClient;
}

interface GoogleOAuthClient {
  client_id: string;
  client_secret: string;
  redirect_uris?: string[];
}

interface GoogleOAuthToken {
  refresh_token?: string;
  access_token?: string;
}

interface DriveFile {
  id: string;
  name: string;
  createdTime?: string;
}

@Injectable()
export class GoogleDriveBackupService {
  private readonly logger = new Logger(GoogleDriveBackupService.name);

  private async readJson<T>(
    jsonEnvName: string,
    pathEnvName: string,
  ): Promise<T> {
    const inlineJson = process.env[jsonEnvName]?.trim();
    if (inlineJson) {
      return JSON.parse(inlineJson) as T;
    }

    const filePath = process.env[pathEnvName]?.trim();
    if (!filePath) {
      throw new Error(`${jsonEnvName} or ${pathEnvName} is required.`);
    }

    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  }

  private async getAccessToken(): Promise<string> {
    const credentials = await this.readJson<GoogleOAuthCredentials>(
      'GOOGLE_CREDENTIALS_JSON',
      'GOOGLE_CREDENTIALS_PATH',
    );
    const token = await this.readJson<GoogleOAuthToken>(
      'GOOGLE_TOKEN_JSON',
      'GOOGLE_TOKEN_PATH',
    );

    const client = credentials.installed ?? credentials.web;
    if (!client?.client_id || !client?.client_secret) {
      throw new Error('Google OAuth credentials are invalid.');
    }

    if (!token.refresh_token) {
      if (token.access_token) {
        return token.access_token;
      }
      throw new Error(
        'Google token must contain refresh_token (recommended) or access_token.',
      );
    }

    const body = new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Failed to refresh Google OAuth token (${response.status}): ${details}`,
      );
    }

    const result = (await response.json()) as { access_token?: string };
    if (!result.access_token) {
      throw new Error('Google OAuth refresh did not return an access token.');
    }

    return result.access_token;
  }

  private async requestJson<T>(
    url: string,
    accessToken: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Google Drive request failed (${response.status}): ${details}`,
      );
    }

    return (await response.json()) as T;
  }

  private escapeDriveQueryValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  async ensureFolder(folderName: string): Promise<string> {
    const accessToken = await this.getAccessToken();
    const escapedName = this.escapeDriveQueryValue(folderName);
    const query = encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`,
    );

    const list = await this.requestJson<{ files?: DriveFile[] }>(
      `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)&pageSize=10`,
      accessToken,
    );

    const existing = list.files?.[0];
    if (existing?.id) {
      return existing.id;
    }

    const created = await this.requestJson<{ id: string }>(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      accessToken,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      },
    );

    return created.id;
  }

  async uploadFile(
    folderId: string,
    filePath: string,
    fileName: string,
  ): Promise<string> {
    const accessToken = await this.getAccessToken();
    const stats = await fs.promises.stat(filePath);

    const createResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'application/octet-stream',
          'X-Upload-Content-Length': String(stats.size),
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
        }),
      },
    );

    if (!createResponse.ok) {
      const details = await createResponse.text();
      throw new Error(
        `Failed to start Google Drive upload (${createResponse.status}): ${details}`,
      );
    }

    const uploadUrl = createResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('Google Drive did not return a resumable upload URL.');
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(stats.size),
      },
      body: fs.createReadStream(filePath) as any,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    if (!uploadResponse.ok) {
      const details = await uploadResponse.text();
      throw new Error(
        `Google Drive upload failed (${uploadResponse.status}): ${details}`,
      );
    }

    const result = (await uploadResponse.json()) as { id?: string };
    if (!result.id) {
      throw new Error('Google Drive upload succeeded without returning file id.');
    }

    return result.id;
  }

  async applyRetention(folderId: string, keep: number): Promise<void> {
    if (!Number.isInteger(keep) || keep < 1) {
      throw new Error('RETENTION_DAILY must be a positive integer.');
    }

    const accessToken = await this.getAccessToken();
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);

    const list = await this.requestJson<{ files?: DriveFile[] }>(
      `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name,createdTime)&orderBy=createdTime%20desc&pageSize=100`,
      accessToken,
    );

    const backupFiles = (list.files ?? []).filter(
      (file) => file.name.startsWith('medixa-daily-') && file.name.endsWith('.dump.enc'),
    );

    for (const file of backupFiles.slice(keep)) {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Failed to delete old Drive backup ${file.name} (${response.status}): ${details}`,
        );
      }

      this.logger.log(`Deleted old Drive backup: ${file.name}`);
    }
  }
}
