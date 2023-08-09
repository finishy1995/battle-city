import axios, {AxiosRequestConfig} from "axios";
import {BaseResponse, LoginResponse} from "../types/server";
import {randint} from "./common";
import {decodeClientResponse, encodeClientRequest} from "../proto/gate";
import {decodeStartResponse, encodeStartRequest} from "../proto/matchmaking";

const serverUrl = "http://localhost:6900";
let ws: WebSocket = null;
let id = randint(1, 9999).toString();
let gate_endpoint = "";
let gate_token = "";

export async function login() : Promise<BaseResponse> {
  let response: BaseResponse = {
    code: 400,
  };
  const formData: FormData = new FormData();
  formData.append('token', id);
  formData.append('platform', 'mock');

  try {
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
    const res = await axios.post(serverUrl + "/api/connect", {
      token: id,
      platform: 'mock'
    }, config);
    let data = res.data as LoginResponse;
    if (res.data.code < 100) {
      response.code = res.data.code;
      gate_endpoint = data.gate_endpoint!;
      gate_token = data.gate_token!;
    }
    console.log(id, gate_endpoint, gate_token);

    // 创建 websocket 连接
    createWebSocket("ws://" + gate_endpoint, gate_token);
  } catch (error) {
    console.error(error)
  }

  return response;
}

export function startMatchmaking(stage: number): void {
  let req = encodeStartRequest({
    matchType: stage,
  })
  let msg = encodeClientRequest({
    id: messageId,
    method: "/matchmaking.Matchmaking/start",
    content: req,
  })
  ws.send(msg);
}

let messageId = 0;

function createWebSocket(url: string, token: string): void {
  ws = new WebSocket(url);
  ws.onopen = function () {
    console.log("连接成功");
    ws.send(gate_token);
  }
  ws.onmessage = function (evt) {
    let resp = decodeClientResponse(stringToUint8Array(evt.data));
    console.log("接收到消息", resp);
    messageId = resp.id + 1;

    switch (resp.method) {
      case "/matchmaking.Matchmaking/start":
        let dict: CustomEventInit = {
          detail: {
            code: 0,
          }
        }
        if (resp.code == undefined || resp.code < 100) {
          let startResponse = decodeStartResponse(resp.content);
          dict.detail.code = startResponse.code;
        } else {
          dict.detail.code = resp.code;
        }
        if (dict.detail.code == undefined) dict.detail.code = 0;
        if (dict.detail.code < 100) {
          console.log("匹配成功");
        } else {
          console.error("匹配失败", dict.detail.code);
        }

        const event = new CustomEvent("matchmaking_start", dict)
        document.dispatchEvent(event);
        break
      case "":
        if (resp.id === 1) {
          const event = new CustomEvent("server_login");
          document.dispatchEvent(event);
        }
        break
      default:
        break
    }
  }
  ws.onclose = function () {
    console.log("连接关闭");
    ws = null;
    const event = new CustomEvent("server_logout");
    document.dispatchEvent(event);
  }
  ws.onerror = function (evt) {
    console.log("连接错误", evt);
    const event = new CustomEvent("server_error", {
      detail: evt
    });
    document.dispatchEvent(event);
  }
}

function stringToUint8Array(str: string): Uint8Array{
  let arr = [];
  for (let i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i));
  }

  return new Uint8Array(arr)
}
