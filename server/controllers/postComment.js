import shortid from 'shortid'
import validator from 'validator'
import valiObj from '../../utils/validate'
import { log, renderApiData, renderApiErr, getClientIp } from '../utils'
import User from '../models/User'
import Post from '../models/Post'
import PostComment from '../models/PostComment'

// 校验创建评论字段
let checkCreateCommentFields = (formData, req) => {
  // fakemark 防伪标识， 值为 quillcms_comment_mark_[时间戳]
  let { post, owner, replyer, content, fakemark } = formData
  let _session = req.session

  if (!/^quillcms_comment_mark_\d{13}$/.test(fakemark)) {
    return {
      status: false,
      msg: '参数错误'
    }
  } else if (!shortid.isValid(post)) {
    return {
      status: false,
      msg: '无效文章ID'
    }
  } else if (!shortid.isValid(owner)) {
    return {
      status: false,
      msg: '无效用户ID'
    }
  } else if (owner !== _session.userInfo.id) {
    return {
      status: false,
      msg: '身份验证失败'
    }
  } else if (replyer && !shortid.isValid(replyer)) {
    return {
      status: false,
      msg: '无效回复用户ID'
    }
  } else if (content.length < 5 || content.length > 200) {
    return {
      status: 'false',
      msg: '评论内容长度为5-200字符'
    }
  }

  return {
    status: true,
    msg: '校验成功'
  }
}

export default {
  // 管理员功能
  // 开启或禁用
  async updateOne(req, res, next) {
    let fields = req.body
    let _session = req.session
    if (!shortid.isValid(fields._id) || !_session.userLogined || (_session.userInfo.role !== 'super' && _session.userInfo.role !== 'admin')) {
      return res.status(500).send(renderApiErr(req, res, 500, '更新失败'))
    } else if (fields.enable !== 'true' && fields.enable !== 'false') {
      return res.status(500).send(renderApiErr(req, res, 500, '更新失败'))
    }

    let obj = {
      enable: fields.enable === false ? false : true
    }
    let successMsg = obj.enable ? '已开启' : '已禁用'

    try {
      let item_id = fields._id
      await PostComment.findOneAndUpdate({ _id: item_id }, { $set: obj })
      return res.send(renderApiData(req, res, 200, successMsg, { id: item_id }))
    } catch (err) {
      return res.status(500).send(renderApiErr(req, res, 500, err))
    }
  },

  // 删除一个
  async deleteOne(req, res, next) {
    try {
      let userInfo = req.session.userInfo
      let errMsg = ''
      let id = req.params.id
      log(id)
      if (!shortid.isValid(id)) {
        errMsg = 'ID格式校验失败'
      }

      if (userInfo.role !== 'super' && userInfo.role !== 'admin') {
        errMsg = '没有操作权限'
      }

      if (errMsg) {
        return res.status().send(renderApiErr(req, res, 500, errMsg))
      }

      await PostComment.remove({ _id: id })
      return res.send(renderApiData(req, res, 200, '删除成功', {}))
    } catch (err) {
      return res.status(500).send(renderApiErr(req, res, 500, err))
    }
  },

  // 会员发表评论
  async postComment(req, res, next) {
    // 校验传入的参数
    let fields = req.body
    try {
      let validateResult = checkCreateCommentFields(fields, req)
      if (!validateResult.status) {
        return res.status(500).send(renderApiErr(req, res, 500, validateResult.msg))
      }
    } catch (err) {
      return res.status(500).send(renderApiErr(req, res, 500, err))
    }

    const commentObj = {
      post: fields.post,
      content: fields.content,
      owner: fields.owner,
      replyer: fields.replyer,
      create_ip: getClientIp(req)
    }

    let newComment = new PostComment(commentObj)
    try {
      let comment = await newComment.save()
      // 更新文章评论数量信息
      await Post.findOneAndUpdate({_id: fields.post}, {'$inc': {commentsNum: 1}})
      // 对用户留言加分
      return res.send(renderApiData(req, res, 200, '留言成功', {id: comment._id}))
    } catch (err) {
      return res.status(500).send(renderApiErr(req, res, 500, err))
    }
  },

  // 评论列表
  async getCommens(req, res, next) {
    try {
      let _session = req.session
      let fields = req.query
      let queryObj = {}
      let page = Number(fields.page) || 1
      let pageSize = Number(fields.pageSize) || 10
      let postId = fields.postId
      let ownerId = fields.ownerId
      let searchkey = req.query.searchkey
      let isHot = fields.isHot

      // 前台未登录 || 会员只显示启用的评论
      if (!_session.userInfo || _session.userInfo.role === 'member') {
        queryObj.enable = true
      }

      if (postId) {
        queryObj.post = postId
      }

      if (ownerId) {
        queryObj.owner = ownerId
      }

      if (searchkey) {
        let reKey = new RegExp(searchkey, 'i')
        queryObj.content = { $regex: reKey }
      }

      // 排序
      let sortObj = { data: -1 }
      if (isHot) {
        sortObj = { likes_num: -1 }
      }

      log(queryObj)

      // 查询文档
      const commentList = await PostComment.find(queryObj).sort(sortObj).skip((page - 1) * pageSize).limit(pageSize).populate([
        {
          path: 'post',
          select: '_id title'
        },
        {
          path: 'owner',
          select: '_id nickname enable avatar'
        },
        {
          path: 'replyer',
          select: '_id nickname enable avatar'
        }
      ]).exec()
      const totalCounts = await PostComment.count(queryObj)

      log(commentList, totalCounts)

      let tagObj = {
        list: commentList,
        page: page,
        lastPage: Math.ceil(totalCounts / pageSize),
        pageSize: pageSize,
        totalCounts: totalCounts
      }
      return res.send(renderApiData(req, res, 200, '评论列表获取成功', tagObj))
    } catch (err) {
      return res.status(500).send(renderApiErr(req, res, 500, err))
    }
  }
}