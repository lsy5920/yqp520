<script setup lang="ts">
import { computed } from 'vue'
import type { AssessmentQuestion } from '@/types/assessment'

/**
 * 组件入参类型
 * 用途：约束答题卡片渲染时所需的题目数据和当前答案
 */
interface AssessmentQuestionCardProps {
  /** 用途：当前要渲染的题目对象 */
  question: AssessmentQuestion
  /** 用途：当前题目已选择的选项编号数组 */
  selectedOptionIds?: string[]
  /** 用途：是否禁用作答操作 */
  disabled?: boolean
}

/**
 * 组件事件类型
 * 用途：把单选和多选操作分别抛给外层页面处理
 */
interface AssessmentQuestionCardEmits {
  /** 用途：单选题选择答案时抛出 */
  (event: 'update-single', payload: { questionId: string; optionId: string }): void
  /** 用途：多选题切换答案时抛出 */
  (event: 'toggle-multiple', payload: { questionId: string; optionId: string }): void
}

const props = withDefaults(defineProps<AssessmentQuestionCardProps>(), {
  selectedOptionIds: () => [],
  disabled: false,
})

const emit = defineEmits<AssessmentQuestionCardEmits>()

/**
 * 题型标签
 * 用途：让用户一眼知道当前是单选题还是多选题
 */
const questionTypeLabel = computed<string>(() => (props.question.type === 'single' ? '单选题' : '多选题'))

/**
 * 题型提示文案
 * 用途：提醒用户多选题必须全部选对才得分
 */
const questionHint = computed<string>(() => (
  props.question.type === 'single'
    ? '每题仅可选择一个答案'
    : '多选题必须全对才得分，少选和错选都不得分'
))

/**
 * 判断选项是否已选中
 * 用途：控制当前选项的高亮样式和表单状态
 * 入参：optionId 为选项编号
 * 返回值：已选中返回 true，否则返回 false
 */
function isOptionSelected(optionId: string): boolean {
  return props.selectedOptionIds.includes(optionId)
}

/**
 * 判断是否需要释放触屏焦点
 * 用途：手机端点按按钮后，浏览器有时会为了保持焦点而轻微滚动弹窗，导致题目像突然滑动一下
 * 入参：无
 * 返回值：触屏设备返回 true，否则返回 false
 */
function shouldReleaseTapFocus(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(pointer: coarse)').matches
}

/**
 * 释放当前被点按按钮的焦点
 * 用途：避免手机端选项按钮保留焦点后触发浏览器自动滚动，造成题目区域突然跳动
 * 入参：event 为当前点击事件对象
 * 返回值：无返回值
 */
function releaseTappedOptionFocus(event?: Event): void {
  if (!shouldReleaseTapFocus()) {
    return
  }

  const currentButton = event?.currentTarget

  if (!(currentButton instanceof HTMLButtonElement)) {
    return
  }

  // 这里直接同步移除焦点，尽量抢在浏览器为了保留焦点而自动滚动之前完成处理。
  currentButton.blur()
}

/**
 * 处理选项点击
 * 用途：根据题型抛出单选或多选事件，让外层统一更新答案
 * 入参：optionId 为当前点击的选项编号
 * 返回值：无返回值
 */
function handleOptionClick(optionId: string, event?: MouseEvent): void {
  if (props.disabled) {
    return
  }

  // 这里先释放手机端触屏焦点，避免点击后题目区域被浏览器意外带着轻微滚动。
  releaseTappedOptionFocus(event)

  if (props.question.type === 'single') {
    emit('update-single', {
      questionId: props.question.id,
      optionId,
    })
    return
  }

  emit('toggle-multiple', {
    questionId: props.question.id,
    optionId,
  })
}
</script>

<template>
  <article class="assessment-question-card">
    <div class="assessment-question-card__head">
      <div class="assessment-question-card__meta">
        <span class="assessment-question-card__index">第 {{ question.order }} 题</span>
        <span class="assessment-question-card__type">{{ questionTypeLabel }}</span>
      </div>
      <span class="assessment-question-card__score">{{ question.score }} 分</span>
    </div>

    <h3 class="assessment-question-card__title">{{ question.stem }}</h3>
    <p class="assessment-question-card__hint">{{ questionHint }}</p>

    <div class="assessment-question-card__options">
      <button
        v-for="option in question.options"
        :key="option.id"
        type="button"
        class="assessment-question-card__option"
        :class="{ 'assessment-question-card__option--active': isOptionSelected(option.id) }"
        :disabled="disabled"
        @click="handleOptionClick(option.id, $event)"
      >
        <span class="assessment-question-card__badge">{{ option.label }}</span>
        <span class="assessment-question-card__option-text">{{ option.text }}</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.assessment-question-card {
  display: grid;
  gap: 18px;
  padding: 28px;
  overflow-anchor: none;
  border: 1px solid rgba(147, 203, 198, 0.16);
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(12, 34, 46, 0.88), rgba(7, 22, 30, 0.94)),
    rgba(8, 25, 35, 0.88);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.22);
}

.assessment-question-card__head,
.assessment-question-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.assessment-question-card__head {
  justify-content: space-between;
}

.assessment-question-card__index,
.assessment-question-card__type,
.assessment-question-card__score {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 0.86rem;
}

.assessment-question-card__index {
  background: rgba(139, 208, 203, 0.12);
  color: rgba(139, 208, 203, 0.94);
}

.assessment-question-card__type {
  background: rgba(216, 185, 114, 0.14);
  color: rgba(241, 217, 160, 0.96);
}

.assessment-question-card__score {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(244, 239, 226, 0.82);
}

.assessment-question-card__title,
.assessment-question-card__hint {
  margin: 0;
}

.assessment-question-card__title {
  font-size: 1.36rem;
  line-height: 1.65;
  word-break: break-word;
}

.assessment-question-card__hint {
  color: rgba(244, 239, 226, 0.66);
  font-size: 0.95rem;
  line-height: 1.8;
}

.assessment-question-card__options {
  display: grid;
  gap: 14px;
  overflow-anchor: none;
}

.assessment-question-card__option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  border-radius: 22px;
  background: rgba(5, 19, 28, 0.5);
  color: #f4efe2;
  text-align: left;
  cursor: pointer;
  overflow-anchor: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition:
    transform 0.28s ease,
    border-color 0.28s ease,
    background-color 0.28s ease,
    box-shadow 0.28s ease;
}

.assessment-question-card__option:focus-visible {
  outline: 2px solid rgba(241, 217, 160, 0.72);
  outline-offset: 2px;
}

.assessment-question-card__option:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(216, 185, 114, 0.3);
}

.assessment-question-card__option:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.assessment-question-card__option--active {
  border-color: rgba(216, 185, 114, 0.42);
  background:
    linear-gradient(135deg, rgba(216, 185, 114, 0.14), rgba(9, 34, 46, 0.86)),
    rgba(8, 25, 35, 0.84);
  box-shadow: 0 18px 32px rgba(216, 185, 114, 0.12);
}

.assessment-question-card__badge {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  flex-shrink: 0;
  border-radius: 14px;
  background: rgba(216, 185, 114, 0.14);
  color: rgba(241, 217, 160, 0.98);
}

.assessment-question-card__option-text {
  display: block;
  min-width: 0;
  flex: 1 1 auto;
  line-height: 1.82;
  color: rgba(244, 239, 226, 0.9);
  word-break: break-word;
}

@media (max-width: 720px) {
  /* 这里把手机端题卡头部改成上下排布，避免题号、题型和分数挤在一行互相顶住。 */
  .assessment-question-card__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .assessment-question-card__score {
    align-self: flex-start;
  }

  .assessment-question-card {
    gap: 12px;
    padding: 16px 14px;
  }

  .assessment-question-card__title {
    font-size: 1.06rem;
    line-height: 1.48;
  }

  .assessment-question-card__hint {
    font-size: 0.88rem;
    line-height: 1.65;
  }

  .assessment-question-card__options {
    gap: 10px;
  }

  .assessment-question-card__option {
    align-items: center;
    padding: 12px 12px;
    gap: 10px;
    transition:
      border-color 0.28s ease,
      background-color 0.28s ease,
      box-shadow 0.28s ease;
  }

  /* 这里关掉手机端点按时的位移动画，避免触屏设备把 hover 当成滑动效果。 */
  .assessment-question-card__option:hover:not(:disabled) {
    transform: none;
  }

  .assessment-question-card__badge {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    font-size: 0.82rem;
  }

  .assessment-question-card__option-text {
    line-height: 1.62;
    font-size: 0.92rem;
  }

  .assessment-question-card__index,
  .assessment-question-card__type,
  .assessment-question-card__score {
    min-height: 30px;
    padding: 0 10px;
    font-size: 0.78rem;
  }
}
</style>
