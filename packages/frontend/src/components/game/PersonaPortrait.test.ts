import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PersonaPortrait from './PersonaPortrait.vue';
import type { Persona } from '@wfk/shared';

describe('PersonaPortrait', () => {
  const createPersona = (overrides?: Partial<Persona>): Persona => ({
    id: 'lao-zhou',
    name: '老周',
    avatar: '👨‍💻',
    description: '理性程序员，爱推理画逻辑链',
    speechStyle: '我先听前置位发言，暂时没有强身份信息。',
    ...overrides,
  });

  it('should render persona initial (first character) when persona is provided', () => {
    const persona = createPersona();
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona,
        fallbackName: 'Player 1',
        fallbackInitial: '1',
      },
    });

    expect(wrapper.find('.portrait__glyph').text()).toBe('老');
  });

  it('should render persona name when persona is provided', () => {
    const persona = createPersona();
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona,
        fallbackName: 'Player 1',
        fallbackInitial: '1',
      },
    });

    expect(wrapper.find('.portrait__ribbon-text').text()).toBe('老周');
  });

  it('should render persona id as subtitle when persona is provided', () => {
    const persona = createPersona();
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona,
        fallbackName: 'Player 1',
        fallbackInitial: '1',
      },
    });

    expect(wrapper.find('.portrait__subtitle').text()).toBe('lao-zhou');
  });

  it('should render fallback name when persona is null', () => {
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona: null,
        fallbackName: 'Player 1',
        fallbackInitial: '1',
      },
    });

    expect(wrapper.text()).toContain('Player 1');
  });

  it('should render fallback initial when persona is null', () => {
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona: null,
        fallbackName: 'Player 1',
        fallbackInitial: '1',
      },
    });

    expect(wrapper.text()).toContain('1');
  });

  it('should not render trait (component does not display trait)', () => {
    const persona = createPersona();
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona,
        fallbackName: 'Player 1',
        fallbackInitial: '1',
      },
    });

    // PersonaPortrait doesn't display trait, only name and id
    expect(wrapper.find('.portrait__trait').exists()).toBe(false);
  });

  it('should handle different persona initials', () => {
    const persona = createPersona({ avatar: '🔥', name: '小辣椒' });
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona,
        fallbackName: 'Player 2',
        fallbackInitial: '2',
      },
    });

    expect(wrapper.find('.portrait__glyph').text()).toBe('小');
    expect(wrapper.find('.portrait__ribbon-text').text()).toBe('小辣椒');
  });

  it('should handle "你" as fallback name for human player', () => {
    const wrapper = mount(PersonaPortrait, {
      props: {
        persona: null,
        fallbackName: '你',
        fallbackInitial: '你',
      },
    });

    expect(wrapper.text()).toContain('你');
  });
});
