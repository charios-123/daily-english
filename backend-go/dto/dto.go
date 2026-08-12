package dto

// LoginRequest 登录请求
type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name" binding:"required"`
}

// UserInfo 用户信息（不含密码）
type UserInfo struct {
	ID    uint64 `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

// LoginResponse 登录/注册响应
type LoginResponse struct {
	Token string   `json:"token"`
	User  UserInfo `json:"user"`
}

// ProgressDTO 学习进度响应
type ProgressDTO struct {
	CompletedArticleIDs    []uint64       `json:"completedArticleIds"`
	TotalDaysLearned       int            `json:"totalDaysLearned"`
	TotalArticlesCompleted int            `json:"totalArticlesCompleted"`
	CurrentStreak          int            `json:"currentStreak"`
	LongestStreak          int            `json:"longestStreak"`
	BeginnerCount          int            `json:"beginnerCount"`
	IntermediateCount      int            `json:"intermediateCount"`
	AdvancedCount          int            `json:"advancedCount"`
	LastCompletedDate      *string        `json:"lastCompletedDate"`
	ActivityLog            map[string]int `json:"activityLog"`
	Badges                 []string       `json:"badges"`
}

// PageResult 分页结果（兼容 MyBatis-Plus IPage 字段名）
type PageResult struct {
	Records interface{} `json:"records"`
	Total   int64       `json:"total"`
	Size    int         `json:"size"`
	Current int         `json:"current"`
	Pages   int64       `json:"pages"`
}
