import { useEffect, useState } from 'react'
import { Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../lib/api'
import AdminLayout from '../../components/AdminLayout'

interface User {
  id: number
  email: string
  name: string
  role: string
  createdAt: string
}

export default function UserManagePage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [roleConfirm, setRoleConfirm] = useState<number | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [currentPage])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/users?page=${currentPage}&size=10`)
      if (res.ok) {
        const result = await res.json()
        setUsers(result.data?.records || [])
        setTotalPages(Math.ceil((result.data?.total || 0) / 10))
      }
    } catch (e) {
      console.error('获取用户失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      const res = await api.put(`/admin/users/${user.id}/role`, { role: newRole })
      if (res.ok) {
        setRoleConfirm(null)
        fetchUsers()
      }
    } catch (e) {
      console.error('修改角色失败:', e)
    }
  }

  const handleDelete = async (_id: number) => {
    // 注意：后端可能没有删除用户接口，这里先预留
    alert('删除功能需要后端支持')
    setDeleteConfirm(null)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">用户管理</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">用户名</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">邮箱</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">角色</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">注册时间</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">{user.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{user.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {user.role === 'admin' ? <Shield size={12} /> : <ShieldOff size={12} />}
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {roleConfirm === user.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleRole(user)}
                                  className="px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
                                >
                                  确认
                                </button>
                                <button
                                  onClick={() => setRoleConfirm(null)}
                                  className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRoleConfirm(user.id)}
                                className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition"
                                title={user.role === 'admin' ? '设为普通用户' : '设为管理员'}
                              >
                                {user.role === 'admin' ? <ShieldOff size={16} /> : <Shield size={16} />}
                              </button>
                            )}

                            {deleteConfirm === user.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  确认
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(user.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-slate-600">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
