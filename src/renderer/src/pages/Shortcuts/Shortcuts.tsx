import React, { useContext, useEffect, useRef, useState } from 'react'

import { ModalContext } from '@/contexts/ModalContext.js'

import styles from './Shortcuts.module.css'

interface Shortcut {
  id: string
  command: string
}

const Shortcuts: React.FC = () => {
  const { openModals, setModalOpen } = useContext(ModalContext)
  const uploadImageRef = useRef<HTMLImageElement>(null)

  function onClickBackground(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setModalOpen('shortcuts', false)
    }
  }

  const [shortcuts, setShortcuts] = useState<Shortcut[] | null>(null)

  const [adding, setAdding] = useState<boolean>(false)
  const [newShortcutCommand, setNewShortcutCommand] = useState<string>('')
  const [hasSetImage, setHasSetImage] = useState(false)

  const [editing, setEditing] = useState<boolean>(false)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut>({
    id: '',
    command: ''
  })

  useEffect(() => {
    window.api.getShortcuts().then(shortcuts => {
      setShortcuts(shortcuts)
    })
  }, [])

  async function addShortcut(command: string) {
    if (!command) return

    const id = crypto.randomUUID()

    const shortcut: Shortcut = {
      id,
      command
    }

    await window.api.addShortcut(shortcut)

    setShortcuts(shortcuts => [...(shortcuts || []), shortcut])

    setAdding(false)
    setNewShortcutCommand('')
    uploadImageRef.current!.src = ''
    setHasSetImage(false)
  }

  async function removeShortcut(id: string) {
    await window.api.removeShortcut(id)

    setShortcuts(
      shortcuts => shortcuts && shortcuts.filter(s => s.id !== id)
    )

    setEditing(false)
  }

  async function updateShortcut(shortcut: Shortcut) {
    await window.api.updateShortcut(shortcut)

    setShortcuts(
      shortcuts =>
        shortcuts &&
        shortcuts.map(s => (s.id === shortcut.id ? shortcut : s))
    )

    setEditing(false)
  }

  async function handleAddShortcutClose() {
    window.api.removeNewShortcutImage()
    setAdding(false)
    setNewShortcutCommand('')
    uploadImageRef.current!.src = ''
    setHasSetImage(false)
  }

  return (
    <div
      className={styles.shortcuts}
      data-open={openModals.includes('shortcuts')}
      onClick={onClickBackground}
    >
      {shortcuts ? (
        <div className={styles.grid}>
          {shortcuts.map(shortcut => (
            <div
              className={styles.shortcut}
              key={shortcut.id}
              onClick={() => {
                setEditing(true)
                setEditingShortcut(shortcut)
              }}
            >
              <img src={`shortcut://${shortcut.id}`} />
            </div>
          ))}
          {shortcuts.length < 8 ? (
            <div
              className={styles.shortcut}
              data-type="add"
              onClick={() => setAdding(true)}
            >
              <span className="material-icons">add</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={styles.modal}
        data-shown={adding}
        onClick={e =>
          e.target === e.currentTarget && handleAddShortcutClose()
        }
      >
        <div className={styles.modalContent}>
          <h1>
            Add Shortcut
            <button onClick={() => handleAddShortcutClose()}>
              <span className="material-icons">close</span>
            </button>
          </h1>
          <button
            className={styles.uploadImage}
            onClick={async () => {
              const res = await window.api.uploadShortcutImage('new')
              if (!res) return
              uploadImageRef.current!.src = `shortcut://new?${Date.now()}`
              setHasSetImage(true)
            }}
          >
            <img ref={uploadImageRef} alt="" />
            <span className={styles.hint}>
              <span className="material-icons">upload</span>
              Image
            </span>
          </button>
          <input
            type="text"
            placeholder="Command"
            value={newShortcutCommand}
            onChange={e => setNewShortcutCommand(e.target.value)}
          />
          <div className={styles.buttons}>
            <button
              onClick={() => addShortcut(newShortcutCommand)}
              disabled={!newShortcutCommand || !hasSetImage}
            >
              Add
            </button>
          </div>
        </div>
      </div>
      <div
        className={styles.modal}
        data-shown={editing}
        onClick={e => e.target === e.currentTarget && setEditing(false)}
      >
        <div className={styles.modalContent}>
          <h1>
            Edit Shortcut
            <button onClick={() => setEditing(false)}>
              <span className="material-icons">close</span>
            </button>
          </h1>
          <input
            type="text"
            placeholder="Command"
            value={editingShortcut.command}
            onChange={e =>
              setEditingShortcut({
                ...editingShortcut,
                command: e.target.value
              })
            }
          />
          <div className={styles.buttons}>
            <button
              onClick={() => removeShortcut(editingShortcut.id)}
              data-type="danger"
            >
              Delete
            </button>
            <button
              onClick={() => updateShortcut(editingShortcut!)}
              disabled={!editingShortcut.command}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default Shortcuts
