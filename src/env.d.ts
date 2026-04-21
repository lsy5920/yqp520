/// <reference types="vite/client" />

// 这里声明所有 .vue 文件都能被 TypeScript 正常识别，避免构建时把单文件组件当成未知模块。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  // 这里给 Vue 单文件组件一个通用类型，保证页面和组件导入时都有稳定提示。
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>

  export default component
}
