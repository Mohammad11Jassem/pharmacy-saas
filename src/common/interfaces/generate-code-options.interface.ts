import { CodeType } from "../Enums/code-type.enum"; 

export interface GenerateCodeOptions {
  length?: number;
  type?: CodeType;
  prefix?: string;
  separator?: string;
}