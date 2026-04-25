<script setup lang="ts">
import { computed } from 'vue'
import type { AssessmentQuestion } from '@/types/assessment'

/**
 * 题卡入参类型。
 * 用途：约束题卡需要的题目、答案和禁用状态；入参为当前题目、已选选项和是否禁用；返回值无。
 */
interface AssessmentQuestionCardProps {
  /** 用途：当前正在展示的题目数据。 */
  question: AssessmentQuestion
  /** 用途：当前题目已经选中的选项编号。 */
  selectedOptionIds?: string[]
  /** 用途：是否禁止继续点击选项。 */
  disabled?: boolean
}

/**
 * 题卡事件类型。
 * 用途：把单选和多选操作交给外层页面保存；入参为事件名和题目选项编号；返回值无。
 */
interface AssessmentQuestionCardEmits {
  /** 用途：单选题选择答案时通知外层。 */
  (event: 'update-single', payload: { questionId: string; optionId: string }): void
  /** 用途：多选题切换答案时通知外层。 */
  (event: 'toggle-multiple', payload: { questionId: string; optionId: string }): void
}

/**
 * 组件入参默认值。
 * 用途：避免外层没有传答案数组时报错；入参为组件入参；返回值为带默认值的入参。
 */
const props = withDefaults(defineProps<AssessmentQuestionCardProps>(), {
  selectedOptionIds: () => [],
  disabled: false,
})

/**
 * 组件事件发送器。
 * 用途：向外层页面发送答题动作；入参为事件内容；返回值无。
 */
const emit = defineEmits<AssessmentQuestionCardEmits>()

/**
 * 题型标签。
 * 用途：让用户知道当前题是单选还是多选；入参无；返回值为中文题型文字。
 */
const questionTypeLabel = computed<string>(() => (props.question.type === 'single' ? '单选题' : '多选题'))

/**
 * 题型提示。
 * 用途：说明当前题目的作答规则；入参无；返回值为中文提示文字。
 */
const questionHint = computed<string>(() => (
  props.question.type === 'single'
    ? '每题仅可选择一个答案，点选后可直接进入下一题。'
    : '多选题必须全对才得分，少选和错选都不得分。'
))

/**
 * 判断选项是否选中。
 * 用途：控制选项高亮状态；入参为选项编号；返回值为是否已选。
 */
function isOptionSelected(optionId: string): boolean {
  return props.selectedOptionIds.includes(optionId)
}

/**
 * 判断是否为触屏设备。
 * 用途：手机端点击后释放焦点，避免页面被浏览器带着跳动；入参无；返回值为是否触屏。
 */
function shouldReleaseTapFocus(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(pointer: coarse)').matches
}

/**
 * 释放按钮焦点。
 * 用途：避免手机端按钮保持焦点造成弹窗轻微滚动；入参为点击事件；返回值无。
 */
function releaseTappedOptionFocus(event?: Event): void {
  if (!shouldReleaseTapFocus()) {
    return
  }

  const currentButton = event?.currentTarget

  if (!(currentButton instanceof HTMLButtonElement)) {
    return
  }

  // 这里直接移除焦点，解决手机浏览器点按后自动滚动的问题。
  currentButton.blur()
}

/**
 * 处理选项点击。
 * 用途：按题型发送单选或多选事件；入参为选项编号和点击事件；返回值无。
 */
function handleOptionClick(optionId: string, event?: MouseEvent): void {
  if (props.disabled) {
    return
  }

  // 这里先释放触屏焦点，再交给外层更新答案。
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
/* 这里重做问心题帖视觉，只改变展示效果，不改变题目入参、选项顺序和答题事件。 */
.assessment-question-card {
  position: relative;
  display: grid;
  gap: 20px;
  padding: 30px;
  overflow: hidden;
  overflow-anchor: none;
  border: 1px solid rgba(83, 145, 138, 0.24);
  border-radius: 34px;
  background:
    radial-gradient(circle at 14% 0%, rgba(255, 255, 255, 0.94), transparent 36%),
    radial-gradient(circle at 92% 18%, rgba(139, 208, 203, 0.32), transparent 34%),
    linear-gradient(145deg, rgba(252, 255, 253, 0.96), rgba(220, 241, 235, 0.84));
  box-shadow: 0 26px 62px rgba(53, 102, 104, 0.2);
  isolation: isolate;
  animation: question-card-enter 0.62s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.assessment-question-card::before {
  position: absolute;
  inset: 12px;
  z-index: -1;
  pointer-events: none;
  content: '';
  border: 1px solid rgba(186, 151, 76, 0.24);
  border-radius: 26px;
  background:
    radial-gradient(circle at 8% 12%, rgba(255, 255, 255, 0.62), transparent 28%),
    linear-gradient(120deg, transparent 0 42%, rgba(255, 255, 255, 0.54) 48%, transparent 56% 100%),
    repeating-linear-gradient(105deg, rgba(44, 113, 104, 0.05) 0 1px, transparent 1px 22px);
  background-size: auto, 240% 100%, auto;
  animation: question-ink-shine 6.4s ease-in-out infinite;
}

.assessment-question-card::after {
  position: absolute;
  top: 18px;
  right: 22px;
  width: 68px;
  height: 68px;
  pointer-events: none;
  content: '问心';
  display: grid;
  place-items: center;
  border: 1px solid rgba(186, 151, 76, 0.32);
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(232, 247, 242, 0.9), rgba(145, 201, 191, 0.58));
  color: rgba(29, 86, 89, 0.82);
  font-size: 0.9rem;
  font-weight: 900;
  opacity: 0.78;
  transform: rotate(8deg);
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
  padding-right: 82px;
}

.assessment-question-card__index,
.assessment-question-card__type,
.assessment-question-card__score {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 15px;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 800;
  border: 1px solid rgba(83, 145, 138, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.assessment-question-card__index {
  background: rgba(139, 208, 203, 0.18);
  color: #1d5659;
}

.assessment-question-card__type {
  background: rgba(216, 185, 114, 0.16);
  color: #6a5428;
}

.assessment-question-card__score {
  background: rgba(255, 255, 255, 0.62);
  color: rgba(23, 61, 66, 0.78);
}

.assessment-question-card__title,
.assessment-question-card__hint {
  margin: 0;
}

.assessment-question-card__title {
  padding: 4px 0 0;
  font-size: clamp(1.22rem, 2.3vw, 1.55rem);
  line-height: 1.72;
  color: #173d42;
  word-break: break-word;
}

.assessment-question-card__hint {
  color: rgba(35, 83, 86, 0.72);
  font-size: 0.95rem;
  line-height: 1.8;
  padding: 12px 14px;
  border: 1px solid rgba(83, 145, 138, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.46);
}

.assessment-question-card__options {
  display: grid;
  gap: 12px;
  overflow-anchor: none;
}

.assessment-question-card__option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  overflow: hidden;
  overflow-anchor: none;
  border: 1px solid rgba(83, 145, 138, 0.2);
  border-radius: 24px;
  background:
    radial-gradient(circle at 8% 0%, rgba(255, 255, 255, 0.72), transparent 36%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(226, 244, 239, 0.6)),
    rgba(246, 253, 249, 0.78);
  color: #173d42;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  box-shadow: 0 10px 20px rgba(60, 118, 114, 0.08);
  transition: transform 0.28s ease, border-color 0.28s ease, background-color 0.28s ease, box-shadow 0.28s ease;
}

.assessment-question-card__option::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background:
    radial-gradient(circle at 20% 20%, rgba(113, 180, 171, 0.22), transparent 42%),
    linear-gradient(115deg, transparent 0 42%, rgba(255, 255, 255, 0.44) 50%, transparent 60% 100%);
  background-size: auto, 220% 100%;
  opacity: 0;
  transition: opacity 0.28s ease;
}

.assessment-question-card__option:focus-visible {
  outline: 2px solid rgba(186, 151, 76, 0.72);
  outline-offset: 2px;
}

.assessment-question-card__option:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: rgba(83, 145, 138, 0.42);
  box-shadow: 0 18px 32px rgba(58, 116, 112, 0.16);
}

.assessment-question-card__option:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.assessment-question-card__option--active {
  border-color: rgba(186, 151, 76, 0.68);
  background:
    radial-gradient(circle at 88% 20%, rgba(216, 185, 114, 0.26), transparent 34%),
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.9), transparent 42%),
    linear-gradient(145deg, rgba(233, 248, 242, 0.98), rgba(198, 232, 224, 0.9));
  box-shadow: 0 20px 36px rgba(83, 145, 138, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.78);
}

.assessment-question-card__option--active::before {
  opacity: 1;
  animation: question-option-ink 1.2s ease both;
}

.assessment-question-card__badge {
  position: relative;
  z-index: 1;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid rgba(83, 145, 138, 0.2);
  border-radius: 15px;
  background: linear-gradient(145deg, rgba(236, 248, 244, 0.9), rgba(151, 203, 194, 0.42));
  color: #1e5558;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  font-weight: 900;
}

.assessment-question-card__option-text {
  position: relative;
  z-index: 1;
  display: block;
  min-width: 0;
  flex: 1 1 auto;
  line-height: 1.82;
  color: rgba(23, 61, 66, 0.92);
  word-break: break-word;
}

.assessment-question-card__option--active .assessment-question-card__badge {
  border-color: rgba(149, 110, 39, 0.3);
  background: linear-gradient(145deg, rgba(186, 151, 76, 0.9), rgba(232, 213, 151, 0.86));
  color: #173d42;
  box-shadow: 0 0 0 4px rgba(216, 185, 114, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

@keyframes question-option-ink {
  from { background-position: 0 0, 160% 0; }
  to { background-position: 0 0, -80% 0; }
}

@keyframes question-card-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes question-ink-shine {
  0%, 100% {
    background-position: 160% 0, 0 0;
  }

  48% {
    background-position: -80% 0, 0 0;
  }
}

@media (max-width: 720px) {
  .assessment-question-card {
    gap: 13px;
    padding: 18px 14px 16px;
    border-radius: 26px;
  }

  .assessment-question-card::before {
    inset: 8px;
    border-radius: 18px;
  }

  .assessment-question-card__head {
    align-items: flex-start;
    flex-direction: column;
    padding-right: 54px;
  }

  .assessment-question-card::after {
    top: 14px;
    right: 14px;
    width: 46px;
    height: 46px;
    border-radius: 16px;
    font-size: 0.72rem;
  }

  .assessment-question-card__score {
    align-self: flex-start;
  }

  .assessment-question-card__title {
    font-size: 1.08rem;
    line-height: 1.62;
  }

  .assessment-question-card__hint {
    font-size: 0.88rem;
    line-height: 1.65;
    padding: 10px 12px;
  }

  .assessment-question-card__options {
    gap: 10px;
  }

  .assessment-question-card__option {
    align-items: center;
    min-height: 60px;
    padding: 12px;
    gap: 10px;
    border-radius: 20px;
  }

  .assessment-question-card__option:hover:not(:disabled) {
    transform: none;
  }

  .assessment-question-card__badge {
    width: 32px;
    height: 32px;
    border-radius: 11px;
    font-size: 0.82rem;
  }

  .assessment-question-card__option-text {
    line-height: 1.62;
    font-size: 0.94rem;
  }

  .assessment-question-card__index,
  .assessment-question-card__type,
  .assessment-question-card__score {
    min-height: 30px;
    padding: 0 10px;
    font-size: 0.78rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .assessment-question-card,
  .assessment-question-card::before {
    animation: none;
  }

  .assessment-question-card__option {
    transition: none;
  }
}
</style>
