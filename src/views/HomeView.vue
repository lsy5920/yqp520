<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { useSiteAudio } from '@/composables/useSiteAudio'
import { siteContent } from '@/data/siteContent'

/**
 * 首页重点入口类型。
 * 用途：约束首屏大按钮需要的文字、路由和样式；入参无；返回值无。
 */
interface HomePrimaryEntry {
  /** 用途：入口按钮主文案。 */
  label: string
  /** 用途：入口按钮辅助说明。 */
  hint: string
  /** 用途：入口跳转地址。 */
  path: string
  /** 用途：入口在视觉上的强调等级。 */
  tone: 'primary' | 'secondary' | 'soft'
}

/**
 * 首页入门步骤类型。
 * 用途：约束入门三步卡片的展示内容；入参无；返回值无。
 */
interface HomeJoinStep {
  /** 用途：步骤序号。 */
  order: string
  /** 用途：步骤标题。 */
  title: string
  /** 用途：步骤说明。 */
  description: string
  /** 用途：点击后前往的页面。 */
  path: string
}

/**
 * 首页根节点。
 * 用途：交给滚动显现动效统一观察；入参无；返回值为页面元素或空值。
 */
const pageRef = ref<HTMLElement | null>(null)

/**
 * 背景音乐状态与启播方法。
 * 用途：首页保留清音入口；入参为站点音乐配置；返回值为是否有曲目和重试播放方法。
 */
const { hasAvailableTrack, retryPlay } = useSiteAudio(siteContent.musicTracks)

// 这里启用滚动显现动效，让首页宣传区逐段进入视线。
useRevealMotion({
  rootRef: pageRef,
})

/**
 * 音乐按钮文案。
 * 用途：根据是否配置音乐切换提示；入参无；返回值为按钮文字。
 */
const musicButtonLabel = computed(() => (hasAvailableTrack.value ? '启一缕清音' : '清音待置入'))

/**
 * 首屏重点入口。
 * 用途：让手机端第一屏直接看见最重要的行动方向；入参无；返回值为入口数组。
 */
const primaryEntries: HomePrimaryEntry[] = [
  {
    label: '进入问心考核',
    hint: '先明门风，再答入门卷',
    path: '/join',
    tone: 'primary',
  },
  {
    label: '查看云栖名册',
    hint: '看同门名帖与公开留名',
    path: '/roster/list',
    tone: 'secondary',
  },
  {
    label: '生成江湖帖',
    hint: '留一张自己的江湖名帖',
    path: '/member-card',
    tone: 'soft',
  },
]

/**
 * 入门三步。
 * 用途：把入派路径讲清楚，降低新用户理解成本；入参无；返回值为步骤数组。
 */
const joinSteps: HomeJoinStep[] = [
  {
    order: '壹',
    title: '读全典',
    description: '先看清云栖派为何而立、以何为礼、如何相处。',
    path: '/canon',
  },
  {
    order: '贰',
    title: '过问心',
    description: '完成入门考核，确认你认同这处山门的风骨。',
    path: '/join',
  },
  {
    order: '叁',
    title: '入名册',
    description: '考核合格后递交文牒，审核通过便可入册留名。',
    path: '/roster',
  },
]

/**
 * 首页宣传短签。
 * 用途：增强首屏江湖氛围；入参无；返回值为短句数组。
 */
const floatingNotes = ['云深有栖处', '同道不孤行', '来去皆随缘']

/**
 * 处理音乐入口点击。
 * 用途：用户点击后尝试播放背景音乐；入参无；返回值无。
 */
function handleMusicEntry(): void {
  if (!hasAvailableTrack.value) {
    return
  }

  // 这里忽略播放承诺的返回值，失败时由全局音乐逻辑继续兜底提示。
  void retryPlay()
}
</script>

<template>
  <div ref="pageRef" class="page page--home">
    <section class="home-gate" data-reveal>
      <div class="home-gate__mist home-gate__mist--one" aria-hidden="true"></div>
      <div class="home-gate__mist home-gate__mist--two" aria-hidden="true"></div>
      <div class="home-gate__bamboo" aria-hidden="true"></div>

      <div class="home-gate__main">
        <div class="home-gate__logo-wrap" aria-hidden="true">
          <img class="home-gate__logo" src="/images/yunqi-logo.png" alt="" />
        </div>

        <p class="home-gate__eyebrow">云栖派 · 官方山门</p>
        <h1 class="home-gate__title">
          {{ siteContent.site.name }}
          <span>{{ siteContent.site.subtitle }}</span>
        </h1>
        <p class="home-gate__lead">{{ siteContent.site.lead }}</p>

        <div class="home-gate__credo" aria-label="云栖派总旨">
          <span v-for="line in siteContent.home.credoLines" :key="line">{{ line }}</span>
        </div>

        <div class="home-gate__actions" aria-label="首页重点入口">
          <RouterLink
            v-for="entry in primaryEntries"
            :key="entry.path"
            :to="entry.path"
            class="home-action"
            :class="`home-action--${entry.tone}`"
          >
            <strong>{{ entry.label }}</strong>
            <span>{{ entry.hint }}</span>
          </RouterLink>
        </div>

        <div class="home-gate__minor-actions">
          <button class="home-mini-button" type="button" @click="handleMusicEntry">
            {{ musicButtonLabel }}
          </button>
          <RouterLink to="/poster" class="home-mini-button">生成云栖海报</RouterLink>
        </div>
      </div>

      <aside class="home-gate__side" data-reveal data-delay="0.12">
        <div class="home-seal-card">
          <p>对外箴言</p>
          <strong>{{ siteContent.site.motto }}</strong>
          <span>以群为门，以诚立派，以缘聚散，以情相守。</span>
        </div>

        <div class="home-floating-notes" aria-hidden="true">
          <span
            v-for="(note, index) in floatingNotes"
            :key="note"
            :style="{ '--note-index': index }"
          >
            {{ note }}
          </span>
        </div>
      </aside>
    </section>

    <section class="home-section" data-reveal>
      <div class="home-section__head">
        <p class="eyebrow">云栖何处</p>
        <h2>不筑高墙，只为同道留一处可安心停靠的山门</h2>
        <p>{{ siteContent.home.opening[1] }}</p>
      </div>

      <div class="home-token-grid">
        <article
          v-for="(item, index) in siteContent.home.highlights"
          :key="item.title"
          class="home-token-card"
          :style="{ '--token-index': index }"
          data-reveal
        >
          <span class="home-token-card__mark">{{ index + 1 }}</span>
          <p>{{ item.lead }}</p>
          <h3>{{ item.title }}</h3>
          <span>{{ item.description }}</span>
        </article>
      </div>
    </section>

    <section class="home-join-path" data-reveal>
      <div class="home-section__head home-section__head--center">
        <p class="eyebrow">入门三步</p>
        <h2>循山路而上，先知门风，再问本心，后入名册</h2>
      </div>

      <div class="home-join-path__line" aria-hidden="true"></div>
      <div class="home-step-grid">
        <RouterLink
          v-for="step in joinSteps"
          :key="step.order"
          :to="step.path"
          class="home-step-card"
          data-reveal
        >
          <span>{{ step.order }}</span>
          <strong>{{ step.title }}</strong>
          <small>{{ step.description }}</small>
        </RouterLink>
      </div>
    </section>

    <section class="home-story" data-reveal>
      <article class="home-story__card home-story__card--serif">
        <p class="content-card__eyebrow">立派初衷</p>
        <h3>不争名夺利，只寻真心难得的同道</h3>
        <p>{{ siteContent.home.opening[0] }}</p>
        <p>云栖派所求，不是扩大声量，而是在人情稀薄处，重拾一份自在与真诚。</p>
      </article>

      <article class="home-story__card">
        <p class="content-card__eyebrow">宗门日常</p>
        <h3>闲时闲话风月，忙时各自安好</h3>
        <ul class="list-column">
          <li v-for="item in siteContent.home.dailyFocus" :key="item">{{ item }}</li>
        </ul>
      </article>
    </section>

    <section class="home-section" data-reveal>
      <div class="home-section__head">
        <p class="eyebrow">一站览尽</p>
        <h2>从门风、日常、考核到名册，一路看见云栖派的完整气韵</h2>
      </div>

      <div class="home-feature-grid">
        <RouterLink
          v-for="item in siteContent.navItems.slice(1)"
          :key="item.path"
          :to="item.path"
          class="home-feature-card"
          data-reveal
        >
          <span>{{ item.label }}</span>
          <small>{{ item.hint }}</small>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page--home {
  gap: 38px;
}

.home-gate {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 24px;
  min-height: min(720px, calc(100vh - 130px));
  padding: clamp(22px, 5vw, 52px);
  overflow: hidden;
  border: 1px solid rgba(83, 145, 138, 0.22);
  border-radius: 38px;
  background:
    radial-gradient(circle at 16% 0%, rgba(255, 255, 255, 0.88), transparent 34%),
    radial-gradient(circle at 88% 18%, rgba(147, 209, 200, 0.24), transparent 36%),
    linear-gradient(145deg, rgba(250, 255, 252, 0.92), rgba(214, 238, 232, 0.78));
  box-shadow: 0 30px 80px rgba(51, 104, 105, 0.18);
  isolation: isolate;
}

.home-gate::before {
  position: absolute;
  inset: 16px;
  z-index: -1;
  pointer-events: none;
  content: '';
  border: 1px solid rgba(186, 151, 76, 0.22);
  border-radius: 30px;
  background:
    linear-gradient(120deg, transparent 0 44%, rgba(255, 255, 255, 0.5) 50%, transparent 58% 100%),
    repeating-linear-gradient(108deg, rgba(48, 115, 101, 0.05) 0 1px, transparent 1px 28px);
  background-size: 240% 100%, auto;
  animation: home-paper-shine 8s ease-in-out infinite;
}

.home-gate__mist {
  position: absolute;
  z-index: -1;
  width: 46vw;
  height: 46vw;
  pointer-events: none;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.72), transparent 62%);
  filter: blur(8px);
  opacity: 0.65;
  animation: home-mist-drift 14s ease-in-out infinite;
}

.home-gate__mist--one {
  top: -18%;
  left: -16%;
}

.home-gate__mist--two {
  right: -18%;
  bottom: -24%;
  animation-delay: -5s;
}

.home-gate__bamboo {
  position: absolute;
  right: 4%;
  bottom: -8%;
  z-index: -1;
  width: 180px;
  height: 360px;
  pointer-events: none;
  opacity: 0.3;
  background:
    linear-gradient(94deg, transparent 0 44%, rgba(49, 113, 95, 0.42) 45% 47%, transparent 48% 100%),
    radial-gradient(ellipse at 46% 14%, rgba(49, 113, 95, 0.24) 0 18%, transparent 19%),
    radial-gradient(ellipse at 58% 34%, rgba(49, 113, 95, 0.22) 0 18%, transparent 19%),
    radial-gradient(ellipse at 40% 58%, rgba(49, 113, 95, 0.2) 0 18%, transparent 19%);
  transform-origin: bottom center;
  animation: home-bamboo-sway 6.5s ease-in-out infinite;
}

.home-gate__main,
.home-gate__side {
  position: relative;
  z-index: 1;
}

.home-gate__main {
  display: grid;
  align-content: center;
  gap: 18px;
  min-width: 0;
}

.home-gate__logo-wrap {
  display: grid;
  width: 82px;
  height: 82px;
  place-items: center;
  border: 1px solid rgba(186, 151, 76, 0.28);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 18px 36px rgba(61, 125, 119, 0.16);
  animation: home-logo-float 4.8s ease-in-out infinite;
}

.home-gate__logo {
  width: 62px;
  height: 62px;
  object-fit: contain;
}

.home-gate__eyebrow {
  margin: 0;
  color: rgba(35, 83, 86, 0.72);
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.home-gate__title {
  display: grid;
  gap: 8px;
  margin: 0;
  color: #173d42;
  font-size: clamp(3rem, 9vw, 6.5rem);
  line-height: 0.95;
  letter-spacing: 0.08em;
}

.home-gate__title span {
  color: rgba(35, 83, 86, 0.72);
  font-size: clamp(1.15rem, 3.8vw, 2rem);
  letter-spacing: 0.22em;
}

.home-gate__lead {
  max-width: 680px;
  margin: 0;
  color: rgba(23, 61, 66, 0.78);
  font-size: clamp(1rem, 2.4vw, 1.18rem);
  line-height: 1.9;
}

.home-gate__credo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-gate__credo span {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(83, 145, 138, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  color: #1d5659;
  font-size: 0.88rem;
  font-weight: 700;
}

.home-gate__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.home-action {
  position: relative;
  display: grid;
  gap: 6px;
  min-height: 92px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid rgba(83, 145, 138, 0.2);
  border-radius: 24px;
  color: #173d42;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 16px 32px rgba(58, 116, 112, 0.12);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.home-action::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.82), transparent 38%);
}

.home-action strong,
.home-action span {
  position: relative;
  z-index: 1;
}

.home-action strong {
  font-size: 1.02rem;
}

.home-action span {
  color: rgba(35, 83, 86, 0.68);
  font-size: 0.84rem;
  line-height: 1.55;
}

.home-action:hover,
.home-action:focus-visible {
  transform: translateY(-4px);
  border-color: rgba(186, 151, 76, 0.44);
  box-shadow: 0 24px 48px rgba(58, 116, 112, 0.18);
}

.home-action--primary {
  background: linear-gradient(145deg, rgba(96, 173, 161, 0.92), rgba(218, 241, 235, 0.92));
}

.home-action--secondary {
  background: linear-gradient(145deg, rgba(229, 246, 242, 0.96), rgba(207, 185, 111, 0.32));
}

.home-action--soft {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(220, 240, 234, 0.78));
}

.home-gate__minor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.home-mini-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid rgba(83, 145, 138, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  color: #1d5659;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.home-gate__side {
  display: grid;
  align-content: center;
  gap: 18px;
}

.home-seal-card {
  display: grid;
  gap: 12px;
  padding: 24px;
  border: 1px solid rgba(186, 151, 76, 0.24);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 22px 46px rgba(58, 116, 112, 0.14);
}

.home-seal-card p,
.home-seal-card strong,
.home-seal-card span {
  margin: 0;
}

.home-seal-card p {
  color: rgba(35, 83, 86, 0.64);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.home-seal-card strong {
  color: #173d42;
  font-size: clamp(1.45rem, 4vw, 2.6rem);
  line-height: 1.35;
}

.home-seal-card span {
  color: rgba(23, 61, 66, 0.72);
  line-height: 1.8;
}

.home-floating-notes {
  position: relative;
  min-height: 180px;
}

.home-floating-notes span {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 116px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(186, 151, 76, 0.2);
  border-radius: 16px 16px 24px 16px;
  background: rgba(250, 255, 252, 0.72);
  color: #1d5659;
  font-weight: 800;
  box-shadow: 0 16px 30px rgba(58, 116, 112, 0.12);
  transform: translate(calc(var(--note-index) * 34px), calc(var(--note-index) * 44px)) rotate(calc(-7deg + var(--note-index) * 6deg));
  animation: home-note-float 5s ease-in-out infinite;
  animation-delay: calc(var(--note-index) * -1.2s);
}

.home-section,
.home-join-path,
.home-story {
  display: grid;
  gap: 20px;
}

.home-section__head {
  display: grid;
  max-width: 760px;
  gap: 10px;
}

.home-section__head--center {
  justify-self: center;
  text-align: center;
}

.home-section__head h2,
.home-section__head p {
  margin: 0;
}

.home-section__head h2 {
  color: #173d42;
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  line-height: 1.35;
}

.home-section__head > p:last-child {
  color: rgba(23, 61, 66, 0.72);
  line-height: 1.85;
}

.home-token-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.home-token-card {
  position: relative;
  display: grid;
  gap: 10px;
  min-height: 230px;
  padding: 22px;
  overflow: hidden;
  border: 1px solid rgba(83, 145, 138, 0.2);
  border-radius: 30px 30px 42px 30px;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.82), transparent 38%),
    linear-gradient(145deg, rgba(246, 255, 251, 0.9), rgba(204, 232, 225, 0.72));
  color: #173d42;
  box-shadow: 0 18px 38px rgba(58, 116, 112, 0.12);
  transform: rotate(calc(-1.4deg + var(--token-index) * 0.8deg));
  animation: home-card-breathe 5.8s ease-in-out infinite;
  animation-delay: calc(var(--token-index) * -0.7s);
}

.home-token-card::after {
  position: absolute;
  right: 18px;
  bottom: -20px;
  width: 86px;
  height: 130px;
  pointer-events: none;
  content: '';
  border-radius: 999px 999px 999px 24px;
  background: linear-gradient(145deg, rgba(68, 142, 113, 0.16), transparent 70%);
  transform: rotate(28deg);
}

.home-token-card__mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 15px;
  background: linear-gradient(145deg, rgba(202, 181, 112, 0.82), rgba(245, 236, 196, 0.8));
  color: #173d42;
  font-weight: 900;
}

.home-token-card p,
.home-token-card h3,
.home-token-card span {
  margin: 0;
}

.home-token-card p {
  color: rgba(35, 83, 86, 0.62);
  font-size: 0.82rem;
  font-weight: 800;
}

.home-token-card h3 {
  font-size: 1.32rem;
}

.home-token-card > span:last-child {
  color: rgba(23, 61, 66, 0.72);
  line-height: 1.78;
}

.home-join-path {
  position: relative;
  padding: clamp(20px, 4vw, 34px);
  border: 1px solid rgba(83, 145, 138, 0.18);
  border-radius: 34px;
  background: rgba(250, 255, 252, 0.5);
  box-shadow: 0 22px 50px rgba(58, 116, 112, 0.12);
}

.home-join-path__line {
  position: absolute;
  right: 12%;
  bottom: 40px;
  left: 12%;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(83, 145, 138, 0.38), rgba(186, 151, 76, 0.44), transparent);
}

.home-step-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.home-step-card {
  display: grid;
  gap: 10px;
  min-height: 174px;
  padding: 20px;
  border: 1px solid rgba(83, 145, 138, 0.2);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.66);
  color: #173d42;
  text-decoration: none;
  box-shadow: 0 16px 34px rgba(58, 116, 112, 0.1);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.home-step-card:hover,
.home-step-card:focus-visible {
  transform: translateY(-4px);
  border-color: rgba(186, 151, 76, 0.42);
  box-shadow: 0 22px 44px rgba(58, 116, 112, 0.16);
}

.home-step-card span {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(145deg, rgba(92, 165, 153, 0.88), rgba(218, 241, 235, 0.9));
  font-weight: 900;
}

.home-step-card strong {
  font-size: 1.15rem;
}

.home-step-card small {
  color: rgba(23, 61, 66, 0.7);
  font-size: 0.9rem;
  line-height: 1.7;
}

.home-story {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.home-story__card {
  display: grid;
  gap: 12px;
  padding: 24px;
  border: 1px solid rgba(83, 145, 138, 0.18);
  border-radius: 30px;
  background: rgba(250, 255, 252, 0.62);
  color: #173d42;
  box-shadow: 0 18px 40px rgba(58, 116, 112, 0.1);
}

.home-story__card--serif {
  font-family: var(--font-serif, inherit);
}

.home-story__card h3,
.home-story__card p {
  margin: 0;
}

.home-story__card p,
.home-story__card li {
  color: rgba(23, 61, 66, 0.74);
  line-height: 1.85;
}

.home-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.home-feature-card {
  display: grid;
  gap: 8px;
  min-height: 112px;
  padding: 18px;
  border: 1px solid rgba(83, 145, 138, 0.18);
  border-radius: 24px;
  background:
    radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.76), transparent 42%),
    rgba(246, 255, 251, 0.66);
  color: #173d42;
  text-decoration: none;
  box-shadow: 0 14px 28px rgba(58, 116, 112, 0.1);
  transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
}

.home-feature-card:hover,
.home-feature-card:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(186, 151, 76, 0.38);
  box-shadow: 0 20px 38px rgba(58, 116, 112, 0.16);
}

.home-feature-card span {
  font-size: 1.05rem;
  font-weight: 900;
}

.home-feature-card small {
  color: rgba(35, 83, 86, 0.68);
  font-size: 0.86rem;
}

@keyframes home-paper-shine {
  0%, 100% { background-position: 170% 0, 0 0; }
  50% { background-position: -80% 0, 0 0; }
}

@keyframes home-mist-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(28px, 16px, 0) scale(1.08); }
}

@keyframes home-bamboo-sway {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes home-logo-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}

@keyframes home-note-float {
  0%, 100% { margin-top: 0; }
  50% { margin-top: -12px; }
}

@keyframes home-card-breathe {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -8px; }
}

@media (max-width: 860px) {
  .page--home {
    gap: 28px;
  }

  .home-gate {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 22px 16px;
    border-radius: 28px;
  }

  .home-gate::before {
    inset: 9px;
    border-radius: 22px;
  }

  .home-gate__logo-wrap {
    width: 68px;
    height: 68px;
    border-radius: 22px;
  }

  .home-gate__logo {
    width: 52px;
    height: 52px;
  }

  .home-gate__title {
    font-size: clamp(2.55rem, 16vw, 4.2rem);
  }

  .home-gate__title span {
    font-size: 1rem;
    letter-spacing: 0.16em;
  }

  .home-gate__actions {
    grid-template-columns: 1fr;
  }

  .home-action {
    min-height: 76px;
    border-radius: 22px;
  }

  .home-gate__side {
    gap: 12px;
  }

  .home-floating-notes {
    min-height: 126px;
  }

  .home-floating-notes span {
    min-width: 100px;
    min-height: 38px;
    font-size: 0.84rem;
    transform: translate(calc(var(--note-index) * 24px), calc(var(--note-index) * 30px)) rotate(calc(-6deg + var(--note-index) * 5deg));
  }

  .home-token-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .home-token-card {
    min-height: 188px;
    padding: 16px;
    border-radius: 24px 24px 34px 24px;
  }

  .home-token-card h3 {
    font-size: 1.08rem;
  }

  .home-token-card > span:last-child {
    font-size: 0.86rem;
    line-height: 1.62;
  }

  .home-join-path {
    padding: 18px 12px;
    border-radius: 26px;
  }

  .home-join-path__line {
    top: 132px;
    right: auto;
    bottom: 32px;
    left: 34px;
    width: 3px;
    height: auto;
    background: linear-gradient(180deg, transparent, rgba(83, 145, 138, 0.38), rgba(186, 151, 76, 0.44), transparent);
  }

  .home-step-grid,
  .home-story,
  .home-feature-grid {
    grid-template-columns: 1fr;
  }

  .home-step-card {
    min-height: 136px;
    padding: 16px 16px 16px 62px;
  }

  .home-step-card span {
    position: absolute;
    left: 16px;
  }

  .home-feature-card {
    min-height: 86px;
  }
}

@media (max-width: 430px) {
  .home-token-grid {
    grid-template-columns: 1fr 1fr;
  }

  .home-token-card {
    min-height: 178px;
    padding: 14px;
  }

  .home-token-card__mark {
    width: 34px;
    height: 34px;
    border-radius: 12px;
  }

  .home-token-card p {
    font-size: 0.76rem;
  }

  .home-token-card h3 {
    font-size: 1rem;
  }

  .home-token-card > span:last-child {
    font-size: 0.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-gate::before,
  .home-gate__mist,
  .home-gate__bamboo,
  .home-gate__logo-wrap,
  .home-floating-notes span,
  .home-token-card {
    animation: none;
  }

  .home-action,
  .home-step-card,
  .home-feature-card {
    transition: none;
  }
}
</style>
