import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SpeechSpotlight from './SpeechSpotlight.vue';
import type { Player } from '@wfk/shared';
import type { ActiveSpeech } from '@/composables/useSpeechSpotlight';

describe('SpeechSpotlight', () => {
  const createPlayer = (overrides?: Partial<Player>): Player => ({
    id: 'p1',
    seat: 1,
    role: 'villager',
    alive: true,
    isHuman: false,
    revealed: false,
    personaId: 'lao-zhou',
    displayName: 'Player 1',
    poisonedTonight: false,
    canVote: true,
    ...overrides,
  });

  const createActiveSpeech = (overrides?: Partial<ActiveSpeech>): ActiveSpeech => ({
    playerId: 'p1',
    persona: {
      id: 'lao-zhou',
      name: '老周',
      avatar: '👨‍💻',
      description: '理性程序员，爱推理画逻辑链',
      speechStyle: '我先听前置位发言，暂时没有强身份信息。',
    },
    content: 'This is a test speech',
    internalThought: 'Internal thought here',
    day: 1,
    type: 'SPEAK',
    ...overrides,
  });

  const defaultProps = {
    active: createActiveSpeech(),
    typedChars: 10,
    players: [createPlayer()],
    personaNames: { p1: '老周' },
    lovers: null,
    sheriffId: null,
    godView: false,
    day: 1,
    phase: 'DAY_DISCUSSION',
  };

  // Mock Arco Design button component
  const stubs = {
    'a-button': {
      template: '<button @click="$emit(\'click\')"><slot /></button>',
    },
  };

  it('should render the spotlight overlay', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('.spotlight').exists()).toBe(true);
  });

  it('should display visible content based on typedChars', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: {
        ...defaultProps,
        typedChars: 4,
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('This');
  });

  it('should show typing caret when not fully typed', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: {
        ...defaultProps,
        typedChars: 10,
      },
      global: { stubs },
    });

    expect(wrapper.find('.spotlight__caret').exists()).toBe(true);
  });

  it('should not show typing caret when fully typed', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: {
        ...defaultProps,
        typedChars: defaultProps.active.content.length,
      },
      global: { stubs },
    });

    expect(wrapper.find('.spotlight__caret').exists()).toBe(false);
  });

  it('should emit skip event when clicking overlay background', async () => {
    const wrapper = mount(SpeechSpotlight, {
      props: defaultProps,
      global: { stubs },
    });
    await wrapper.find('.spotlight').trigger('click');
    expect(wrapper.emitted('skip')).toBeTruthy();
  });

  it('should emit skip event when pressing ESC key', async () => {
    const wrapper = mount(SpeechSpotlight, {
      props: defaultProps,
      global: { stubs },
    });
    await wrapper.find('.spotlight').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('skip')).toBeTruthy();
  });

  it('should emit skip event when clicking skip button', async () => {
    const wrapper = mount(SpeechSpotlight, {
      props: defaultProps,
      global: { stubs },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('skip')).toBeTruthy();
  });

  it('should display day information', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.text()).toContain('第 1 天');
  });

  it('should show internal thought in god view mode', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: {
        ...defaultProps,
        godView: true,
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Internal thought here');
    expect(wrapper.text()).toContain('内心独白');
  });

  it('should not show internal thought when not in god view', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: {
        ...defaultProps,
        godView: false,
      },
      global: { stubs },
    });

    expect(wrapper.text()).not.toContain('Internal thought here');
  });

  it('should display "上警发言" badge for SHERIFF_RUN type', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: {
        ...defaultProps,
        active: createActiveSpeech({ type: 'SHERIFF_RUN' }),
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('上警发言');
  });

  it('should display "白天发言" badge for SPEAK type', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: {
        ...defaultProps,
        active: createActiveSpeech({ type: 'SPEAK' }),
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('白天发言');
  });

  it('should have proper ARIA attributes', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: defaultProps,
      global: { stubs },
    });
    const spotlight = wrapper.find('.spotlight');

    expect(spotlight.attributes('role')).toBe('dialog');
    expect(spotlight.attributes('aria-modal')).toBe('true');
    expect(spotlight.attributes('aria-labelledby')).toBe('spotlight-title');
    expect(spotlight.attributes('tabindex')).toBe('0');
  });

  it('should have screen reader only title', () => {
    const wrapper = mount(SpeechSpotlight, {
      props: defaultProps,
      global: { stubs },
    });
    const srTitle = wrapper.find('#spotlight-title');

    expect(srTitle.exists()).toBe(true);
    expect(srTitle.classes()).toContain('sr-only');
    expect(srTitle.text()).toBe('玩家发言');
  });
});
