package utils

// Result 统一响应结构，与旧 Java 后端的 Result<T> 保持相同格式
type Result struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
	Msg  string      `json:"msg"`
}

// Success 成功响应（带数据）
func Success(data interface{}) Result {
	return Result{Code: 200, Data: data, Msg: "success"}
}

// SuccessMsg 成功响应（带自定义消息）
func SuccessMsg(data interface{}, msg string) Result {
	return Result{Code: 200, Data: data, Msg: msg}
}

// Error 失败响应
func Error(code int, msg string) Result {
	return Result{Code: code, Data: nil, Msg: msg}
}
