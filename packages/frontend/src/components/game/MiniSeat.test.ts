import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MiniSeat from './MiniSeat.vue';
import type { Player } from '@wfk/shared';

describe('MiniSeat', () => {
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

  it('should render player seat number', () => {
    const player = createPlayer({ seat: 5 });
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: false,
        isSheriff: false,
      },
    });

    expect(wrapper.text()).toContain('5');
  });

  it('should show persona name when provided', () => {
    const player = createPlayer();
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: false,
        isSheriff: false,
      },
    });

    expect(wrapper.text()).toContain('老周');
  });

  it('should apply active class when active prop is true', () => {
    const player = createPlayer();
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: true,
        personaName: '老周',
        isLover: false,
        isSheriff: false,
      },
    });

    expect(wrapper.classes()).toContain('mini-seat--active');
  });

  it('should apply dead class when player is not alive', () => {
    const player = createPlayer({ alive: false });
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: false,
        isSheriff: false,
      },
    });

    expect(wrapper.classes()).toContain('mini-seat--dead');
  });

  it('should show lover indicator when isLover is true', () => {
    const player = createPlayer();
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: true,
        isSheriff: false,
      },
    });

    expect(wrapper.find('.mini-seat__badge--lover').exists()).toBe(true);
  });

  it('should show sheriff indicator when isSheriff is true', () => {
    const player = createPlayer();
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: false,
        isSheriff: true,
      },
    });

    expect(wrapper.find('.mini-seat__badge--sheriff').exists()).toBe(true);
  });

  it('should show both lover and sheriff indicators', () => {
    const player = createPlayer();
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: true,
        isSheriff: true,
      },
    });

    expect(wrapper.find('.mini-seat__badge--lover').exists()).toBe(true);
    expect(wrapper.find('.mini-seat__badge--sheriff').exists()).toBe(true);
  });

  it('should apply human class for human player', () => {
    const player = createPlayer({ isHuman: true });
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: false,
        isSheriff: false,
      },
    });

    expect(wrapper.classes()).toContain('mini-seat--human');
  });

  it('should show lover/sheriff indicators even for dead players', () => {
    const player = createPlayer({ alive: false });
    const wrapper = mount(MiniSeat, {
      props: {
        player,
        active: false,
        personaName: '老周',
        isLover: true,
        isSheriff: true,
      },
    });

    // Dead players still show indicators (they're just styled differently)
    expect(wrapper.find('.mini-seat__badge--lover').exists()).toBe(true);
    expect(wrapper.find('.mini-seat__badge--sheriff').exists()).toBe(true);
  });
});
