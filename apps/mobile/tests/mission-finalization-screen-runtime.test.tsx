import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { Mission } from '../types/mission'
import { commonNativeComponents } from './support/native-component'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-native', () => commonNativeComponents())
vi.mock('expo-status-bar', () => ({ StatusBar: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement('StatusBar', props, children) }))
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement('SafeAreaView', props, children),
}))

import { MissionCompletionScreen, MissionFinalizationScreen } from '../screens/mission-finalization'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

function textNode(renderer: TestRenderer.ReactTestRenderer, expected: string): TestRenderer.ReactTestInstance {
  const match = renderer.root.findAll((node) => String(node.type) === 'Text' && textContent(node) === expected)[0]
  if (!match) throw new Error(`Text not found: ${expected}`)
  return match
}

function styleRecord(value: unknown): Record<string, unknown> {
  const values: unknown[] = Array.isArray(value) ? Array.from(value) : [value]
  const result: Record<string, unknown> = {}
  for (const item of values) {
    if (typeof item === 'object' && item !== null) Object.assign(result, item)
  }
  return result
}

type ReturnButtonProps = { accessibilityRole?: string; onPress: () => void }

function propsOf<Props>(node: TestRenderer.ReactTestInstance): Props {
  return node.props as unknown as Props
}

function mission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'mission-1',
    volunteer_id: 'user-1',
    label: 'Ramassage Paris',
    status: 'completed',
    started_at: '2026-10-26T09:00:00.000Z',
    ended_at: '2026-10-26T10:01:01.000Z',
    distance_m: 1500,
    duration_s: 3661,
    created_at: '2026-10-26T08:00:00.000Z',
    ...overrides,
  }
}

describe('real mission finalization screens', () => {
  it('renders the synchronizing state without claiming a completed mission', () => {
    let renderer!: TestRenderer.ReactTestRenderer

    act(() => {
      renderer = TestRenderer.create(<MissionFinalizationScreen stage="synchronizing" />)
    })

    expect(textContent(renderer.root)).toContain('ENVOI DES POINTS...')
    expect(textContent(renderer.root)).not.toContain('MISSION TERMINÉE')
    expect(textContent(renderer.root)).not.toContain('REVENIR À L’ACCUEIL')
    expect(textContent(renderer.root)).toContain('Points GPS')
    expect(textContent(renderer.root)).toContain('EN COURS')
    expect(textContent(renderer.root)).toContain('Mission')
    expect(textContent(renderer.root)).toContain('À VENIR')
    expect(styleRecord(textNode(renderer, 'Points GPS').props.style).color).toBe('#f8fafc')
    expect(styleRecord(textNode(renderer, 'Mission').props.style).color).toBe('#cbd5e1')

    const dots = renderer.root.findAll((node) => String(node.type) === 'View' && styleRecord(node.props.style).height === 10)
    expect(dots).toHaveLength(2)
    expect(styleRecord(dots[0].props.style).backgroundColor).toBe('#fbbf24')
    expect(styleRecord(dots[1].props.style).backgroundColor).toBe('#475569')
  })

  it('renders the finalizing state with GPS complete and the mission active', () => {
    let renderer!: TestRenderer.ReactTestRenderer

    act(() => {
      renderer = TestRenderer.create(<MissionFinalizationScreen stage="finalizing" />)
    })

    expect(textContent(renderer.root)).toContain('ENREGISTREMENT...')
    expect(textContent(renderer.root)).not.toContain('MISSION TERMINÉE')
    expect(textContent(renderer.root)).not.toContain('REVENIR À L’ACCUEIL')
    expect(textContent(renderer.root)).toContain('Points GPS')
    expect(textContent(renderer.root)).toContain('OK')
    expect(textContent(renderer.root)).toContain('Mission')
    expect(textContent(renderer.root)).toContain('EN COURS')
    expect(styleRecord(textNode(renderer, 'Points GPS').props.style).color).toBe('#f8fafc')
    expect(styleRecord(textNode(renderer, 'Mission').props.style).color).toBe('#f8fafc')

    const dots = renderer.root.findAll((node) => String(node.type) === 'View' && styleRecord(node.props.style).height === 10)
    expect(dots).toHaveLength(2)
    expect(styleRecord(dots[0].props.style).backgroundColor).toBe('#10b981')
    expect(styleRecord(dots[1].props.style).backgroundColor).toBe('#fbbf24')
  })

  it('renders server-provided completion metrics and calls the exact return action', () => {
    const onReturnHome = vi.fn()
    const completedMission = mission()
    const before = { ...completedMission }
    let renderer!: TestRenderer.ReactTestRenderer

    act(() => {
      renderer = TestRenderer.create(<MissionCompletionScreen mission={completedMission} onReturnHome={onReturnHome} />)
    })

    expect(textContent(renderer.root)).toContain('Ramassage Paris')
    expect(textContent(renderer.root)).toContain('1h 1m')
    expect(textContent(renderer.root)).toContain('1.5 km')

    const returnButton = renderer.root.findByProps({ accessibilityLabel: 'Revenir à l’accueil' })
    const returnButtonProps = propsOf<ReturnButtonProps>(returnButton)
    expect(returnButtonProps.accessibilityRole).toBe('button')
    act(() => {
      returnButtonProps.onPress()
    })
    expect(onReturnHome).toHaveBeenCalledTimes(1)
    expect(onReturnHome).toHaveBeenCalledWith()
    expect(completedMission).toEqual(before)
  })

  it('formats absent and invalid server metrics as unavailable', () => {
    let renderer!: TestRenderer.ReactTestRenderer

    act(() => {
      renderer = TestRenderer.create(
        <MissionCompletionScreen
          mission={mission({ distance_m: Number.POSITIVE_INFINITY, duration_s: null })}
          onReturnHome={vi.fn()}
        />,
      )
    })

    expect(textContent(renderer.root)).toContain('Non disponible')
    expect(renderer.root.findAll((node) => String(node.type) === 'Text' && textContent(node) === 'Non disponible')).toHaveLength(2)
  })
})
