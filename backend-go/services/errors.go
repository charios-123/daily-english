package services

import "errors"

// 业务错误定义
var (
	errArticleAlreadyCompleted = errors.New("该文章已完成")
)

// IsArticleAlreadyCompleted 判断是否为"文章已完成"错误
func IsArticleAlreadyCompleted(err error) bool {
	return errors.Is(err, errArticleAlreadyCompleted)
}
