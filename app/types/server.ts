export interface BaseResponse {
  code: number;
}

export interface LoginResponse {
  code: number;
  gate_endpoint?: string;
  gate_token?: string;
}
