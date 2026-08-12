# 需求文档

## 简介

本文档定义了管理员功能的需求，使管理员能够管理系统中的文章和用户。管理员将拥有创建、编辑、删除文章的权限，以及查看、管理用户账户的能力。该功能旨在为系统提供完整的后台管理能力，确保内容质量和用户管理的有效性。

## 术语表

- **System（系统）**: 指整个英语学习应用程序
- **Admin（管理员）**: 拥有特殊权限的用户，可以管理文章和用户
- **Regular User（普通用户）**: 只能阅读文章和跟踪学习进度的用户
- **Article（文章）**: 包含双语内容的学习材料
- **User Account（用户账户）**: 系统中注册的用户记录
- **Admin Dashboard（管理员仪表板）**: 管理员访问管理功能的界面
- **Authentication Token（认证令牌）**: 用于验证用户身份和权限的凭证

## 需求

### 需求 1

**用户故事：** 作为系统管理员，我希望能够识别和验证管理员身份，以便只有授权用户才能访问管理功能。

#### 验收标准

1. WHEN the System creates a new user account THEN the System SHALL assign a role field with default value "user"
2. WHEN an Admin attempts to access admin endpoints THEN the System SHALL verify the user's role is "admin"
3. IF a Regular User attempts to access admin endpoints THEN the System SHALL reject the request with 403 status code
4. WHEN the System authenticates a user THEN the System SHALL include the user's role in the authentication token
5. THE System SHALL provide a mechanism to promote a Regular User to Admin role through database operations

### 需求 2

**用户故事：** 作为管理员，我希望能够查看所有文章列表，以便了解系统中现有的内容。

#### 验收标准

1. WHEN an Admin requests the article list THEN the System SHALL return all articles with their metadata
2. WHEN displaying articles THEN the System SHALL include article ID, titles, date, difficulty, and status
3. WHEN the article list is empty THEN the System SHALL return an empty array
4. THE System SHALL order articles by creation date in descending order by default
5. WHEN an Admin requests article details THEN the System SHALL return the complete article content including all bilingual fields

### 需求 3

**用户故事：** 作为管理员，我希望能够创建新文章，以便为用户提供新的学习内容。

#### 验收标准

1. WHEN an Admin submits a new article THEN the System SHALL validate all required fields are present
2. WHEN creating an article THEN the System SHALL require titleEn, titleZh, summaryEn, summaryZh, content, difficulty, and durationSeconds
3. IF any required field is missing THEN the System SHALL reject the creation with 400 status code
4. WHEN an article is created THEN the System SHALL generate a unique ID for the article
5. WHEN an article is created THEN the System SHALL set the creation timestamp automatically
6. THE System SHALL validate that difficulty is one of "Beginner", "Intermediate", or "Advanced"
7. THE System SHALL validate that durationSeconds is a positive integer
8. WHEN content is provided THEN the System SHALL validate it is an array of bilingual content blocks

### 需求 4

**用户故事：** 作为管理员，我希望能够编辑现有文章，以便修正错误或更新内容。

#### 验收标准

1. WHEN an Admin submits article updates THEN the System SHALL validate the article ID exists
2. IF the article ID does not exist THEN the System SHALL return 404 status code
3. WHEN updating an article THEN the System SHALL allow partial updates of fields
4. WHEN an article is updated THEN the System SHALL update the updatedAt timestamp automatically
5. THE System SHALL validate updated fields follow the same validation rules as creation
6. WHEN an article is updated THEN the System SHALL preserve fields that are not included in the update request

### 需求 5

**用户故事：** 作为管理员，我希望能够删除文章，以便移除过时或不适当的内容。

#### 验收标准

1. WHEN an Admin requests to delete an article THEN the System SHALL validate the article ID exists
2. IF the article ID does not exist THEN the System SHALL return 404 status code
3. WHEN an article is deleted THEN the System SHALL remove it from the database permanently
4. WHEN an article is deleted THEN the System SHALL return a success confirmation
5. WHEN a deleted article ID exists in user progress THEN the System SHALL maintain data integrity in user records

### 需求 6

**用户故事：** 作为管理员，我希望能够查看所有用户列表，以便了解系统的用户群体。

#### 验收标准

1. WHEN an Admin requests the user list THEN the System SHALL return all users with their basic information
2. WHEN displaying users THEN the System SHALL include user ID, email, name, role, and registration date
3. THE System SHALL exclude password hashes from the returned user data
4. THE System SHALL order users by registration date in descending order by default
5. WHEN the user list is empty THEN the System SHALL return an empty array

### 需求 7

**用户故事：** 作为管理员，我希望能够查看用户的详细信息和学习进度，以便了解用户的使用情况。

#### 验收标准

1. WHEN an Admin requests user details THEN the System SHALL validate the user ID exists
2. IF the user ID does not exist THEN the System SHALL return 404 status code
3. WHEN returning user details THEN the System SHALL include user profile and progress data
4. WHEN returning user details THEN the System SHALL include completed articles count, streak information, and activity log
5. THE System SHALL exclude password hash from user details response

### 需求 8

**用户故事：** 作为管理员，我希望能够删除用户账户，以便移除违规或不活跃的用户。

#### 验收标准

1. WHEN an Admin requests to delete a user THEN the System SHALL validate the user ID exists
2. IF the user ID does not exist THEN the System SHALL return 404 status code
3. WHEN a user is deleted THEN the System SHALL remove the user and associated progress data
4. WHEN a user is deleted THEN the System SHALL cascade delete related UserProgress records
5. WHEN a user is deleted THEN the System SHALL return a success confirmation
6. THE System SHALL prevent an Admin from deleting their own account

### 需求 9

**用户故事：** 作为管理员，我希望能够访问专门的管理员界面，以便方便地执行管理任务。

#### 验收标准

1. WHEN an Admin user logs in THEN the System SHALL display admin navigation options
2. WHEN a Regular User logs in THEN the System SHALL hide admin navigation options
3. WHEN an Admin accesses the admin dashboard THEN the System SHALL display summary statistics
4. WHEN displaying admin dashboard THEN the System SHALL show total users count, total articles count, and recent activity
5. THE System SHALL provide clear navigation between article management and user management sections

### 需求 10

**用户故事：** 作为管理员，我希望能够更改用户的角色，以便授予或撤销管理员权限。

#### 验收标准

1. WHEN an Admin updates a user's role THEN the System SHALL validate the target user ID exists
2. WHEN updating user role THEN the System SHALL validate the new role is either "user" or "admin"
3. IF an invalid role is provided THEN the System SHALL reject the request with 400 status code
4. WHEN a user's role is updated THEN the System SHALL update the role field in the database
5. WHEN a user's role is updated THEN the System SHALL return the updated user information
