import { Router } from 'express'
import PostCategoryController from '../../controllers/postCategory'
const router = Router()

/* 添加分类 */
router.post('/category/new', PostCategoryController.createOne)
router.get('/category/list', PostCategoryController.getList)
router.delete('/category/:id', PostCategoryController.deleteOne)

export default router