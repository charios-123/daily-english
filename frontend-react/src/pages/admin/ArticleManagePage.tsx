import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, X, Save } from 'lucide-react'
import api from '../../lib/api'
import AdminLayout from '../../components/AdminLayout'
import { DIFFICULTY_LABELS } from '../../constants'

interface Article {
  id: number
  date: string
  titleEn: string
  titleZh: string
  summaryEn: string
  summaryZh: string
  content: string
  difficulty: string
  durationSeconds: number
  audioUrl: string
}

const emptyArticle = {
  date: new Date().toISOString().split('T')[0],
  titleEn: '',
  titleZh: '',
  summaryEn: '',
  summaryZh: '',
  content: '[{"en":"","zh":""}]',
  difficulty: 'intermediate',
  durationSeconds: 0,
  audioUrl: ''
}

export default function ArticleManagePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [formData, setFormData] = useState(emptyArticle)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      const res = await api.get('/admin/articles?size=100')
      if (res.ok) {
        const result = await res.json()
        setArticles(result.data?.records || [])
      }
    } catch (e) {
      console.error('获取文章失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingArticle(null)
    setFormData(emptyArticle)
    setShowModal(true)
  }

  const handleEdit = (article: Article) => {
    setEditingArticle(article)
    setFormData({
      date: article.date,
      titleEn: article.titleEn,
      titleZh: article.titleZh,
      summaryEn: article.summaryEn,
      summaryZh: article.summaryZh,
      content: typeof article.content === 'string' ? article.content : JSON.stringify(article.content),
      difficulty: article.difficulty,
      durationSeconds: article.durationSeconds || 0,
      audioUrl: article.audioUrl || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...formData,
        content: formData.content
      }

      let res
      if (editingArticle) {
        res = await api.put(`/admin/articles/${editingArticle.id}`, payload)
      } else {
        res = await api.post('/admin/articles', payload)
      }

      if (res.ok) {
        setShowModal(false)
        fetchArticles()
      } else {
        const data = await res.json()
        alert(data.msg || '保存失败')
      }
    } catch (e) {
      console.error('保存文章失败:', e)
      alert('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/admin/articles/${id}`)
      if (res.ok) {
        setDeleteConfirm(null)
        fetchArticles()
      }
    } catch (e) {
      console.error('删除文章失败:', e)
    }
  }

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-700'
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">文章管理</h1>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-primary-600 transition"
          >
            <Plus size={18} />
            新增文章
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">日期</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">标题</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">难度</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600">{article.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{article.date}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800">{article.titleEn}</div>
                        <div className="text-xs text-slate-500">{article.titleZh}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[article.difficulty] || 'bg-slate-100 text-slate-700'}`}>
                          {DIFFICULTY_LABELS[article.difficulty] || article.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(article)}
                            className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition"
                          >
                            <Edit size={16} />
                          </button>
                          {deleteConfirm === article.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(article.id)}
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
                              onClick={() => setDeleteConfirm(article.id)}
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
        )}
      </div>

      {/* 编辑/创建弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingArticle ? '编辑文章' : '新增文章'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">难度</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="beginner">初级</option>
                    <option value="intermediate">中级</option>
                    <option value="advanced">高级</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">英文标题</label>
                <input
                  type="text"
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Enter English title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">中文标题</label>
                <input
                  type="text"
                  value={formData.titleZh}
                  onChange={(e) => setFormData({ ...formData, titleZh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="输入中文标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">英文摘要</label>
                <textarea
                  value={formData.summaryEn}
                  onChange={(e) => setFormData({ ...formData, summaryEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  rows={2}
                  placeholder="Enter English summary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">中文摘要</label>
                <textarea
                  value={formData.summaryZh}
                  onChange={(e) => setFormData({ ...formData, summaryZh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  rows={2}
                  placeholder="输入中文摘要"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  文章内容 (JSON格式: [&#123;"en":"英文","zh":"中文"&#125;,...])
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                  rows={6}
                  placeholder='[{"en":"First paragraph.","zh":"第一段。"},{"en":"Second paragraph.","zh":"第二段。"}]'
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">音频时长（秒）</label>
                  <input
                    type="number"
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData({ ...formData, durationSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">音频URL</label>
                  <input
                    type="text"
                    value={formData.audioUrl}
                    onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="留空可后续生成"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-primary-600 transition disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
