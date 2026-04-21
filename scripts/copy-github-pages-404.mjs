import { copyFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

// 这里定位打包后的入口页和 404 页路径，用于给 GitHub Pages 单页路由做刷新兜底。
const distDirectory = path.resolve('dist')
const sourceIndexPath = path.join(distDirectory, 'index.html')
const target404Path = path.join(distDirectory, '404.html')

/**
 * 复制入口页到 404 页
 * 用途：让 GitHub Pages 在直接访问子路由时，也能回到同一份前端应用入口
 * 入参：无
 * 返回值：无返回值
 */
async function copyIndexTo404() {
  try {
    // 这里先确认入口页存在，避免打包失败时继续复制导致误导。
    await access(sourceIndexPath, constants.F_OK)
    await copyFile(sourceIndexPath, target404Path)
    console.log('已生成 GitHub Pages 路由兜底文件：dist/404.html')
  } catch (error) {
    // 这里给出明确报错，方便排查是不是构建产物不存在。
    console.error('生成 GitHub Pages 路由兜底文件失败：', error)
    process.exitCode = 1
  }
}

await copyIndexTo404()
