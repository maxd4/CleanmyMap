import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  getItem: vi.fn<() => Promise<string | null>>(),
  setItem: vi.fn(async () => undefined),
  createMobileAction: vi.fn(),
  updateMobileAction: vi.fn(),
  loadMobileActionEditor: vi.fn(async () => ({ status: 'ok', action: {} })),
  publishMobileAction: vi.fn(),
}))

function nativeComponent(name: string) {
  return function NativeComponent({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement(name, props, children)
  }
}

vi.mock('react-native', () => ({
  ActivityIndicator: nativeComponent('ActivityIndicator'),
  StyleSheet: { create: (styles: unknown) => styles },
  Text: nativeComponent('Text'),
  TextInput: nativeComponent('TextInput'),
  TouchableOpacity: nativeComponent('TouchableOpacity'),
  View: nativeComponent('View'),
}))
vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('expo-location', () => ({ Accuracy: { Balanced: 'balanced' } }))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: state.getItem, setItem: state.setItem },
}))
vi.mock('../lib/linked-mission-service', () => ({ createLinkedMission: vi.fn() }))
vi.mock('../lib/mobile-actions-service', () => ({
  createMobileAction: state.createMobileAction,
  updateMobileAction: state.updateMobileAction,
  loadMobileActionEditor: state.loadMobileActionEditor,
  publishMobileAction: state.publishMobileAction,
}))

import { ActionCreateScreen } from '../screens/action-create'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes(label))
}

async function renderScreen() {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<ActionCreateScreen onSessionExpired={vi.fn()} />)
  })
  return renderer
}

describe('mobile action creation runtime', () => {
  beforeEach(() => {
    state.getItem.mockReset()
    state.setItem.mockClear()
    state.createMobileAction.mockReset()
    state.updateMobileAction.mockReset()
    state.loadMobileActionEditor.mockClear()
    state.publishMobileAction.mockReset()
    state.createMobileAction.mockResolvedValue({ status: 'created', id: 'action-1', source: 'actions' })
    state.updateMobileAction.mockResolvedValue({ status: 'ok', actionId: 'action-1', actionPhase: 'pre_action' })
  })

  it('does not overwrite a delayed interrupted draft before restoration completes', async () => {
    let resolveRead!: (value: string | null) => void
    state.getItem.mockReturnValue(new Promise((resolve) => { resolveRead = resolve }))
    const renderer = await renderScreen()

    expect(state.setItem).not.toHaveBeenCalled()

    await act(async () => {
      resolveRead(JSON.stringify({
        draft: { title: 'Brouillon repris', location: 'Parc sauvegardé' },
        section: 'essentiel',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }).props.value).toBe('Brouillon repris')
    expect(renderer.root.findByProps({ accessibilityLabel: 'Lieu' }).props.value).toBe('Parc sauvegardé')
    expect(state.setItem).toHaveBeenCalled()
  })

  it('keeps the local draft visible after a save error and retries without creating a second action after success', async () => {
    state.getItem.mockResolvedValue(null)
    state.createMobileAction.mockRejectedValueOnce(new Error('réseau indisponible')).mockResolvedValueOnce({ status: 'created', id: 'action-1', source: 'actions' })
    const renderer = await renderScreen()
    const title = renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' })

    await act(async () => { title.props.onChangeText('Action à reprendre') })
    const save = findButton(renderer, 'Enregistrer le brouillon')
    await act(async () => { await save?.props.onPress() })
    expect(renderer.root.findAll((node) => textContent(node).includes('réseau indisponible'))).not.toHaveLength(0)
    expect(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }).props.value).toBe('Action à reprendre')

    await act(async () => { await save?.props.onPress() })
    expect(state.createMobileAction).toHaveBeenCalledTimes(2)
    expect(state.updateMobileAction).not.toHaveBeenCalled()

    const saveAgain = findButton(renderer, 'Enregistrer le brouillon')
    await act(async () => { await saveAgain?.props.onPress() })
    expect(state.updateMobileAction).toHaveBeenCalledTimes(1)
    expect(state.createMobileAction).toHaveBeenCalledTimes(2)
  })
})
