import { Router } from 'express'
import UserController from '../../controllers/user'
const router = Router()

/* 添加用户 */
router.post('/user/new', UserController.createUser)
router.post('/user/login', UserController.loginAction)

export default router