import { describe, it, expect } from 'vitest'
import { Collection } from 'index'
import waitForEvent from 'utils/waitForEvent'

// eslint-disable-next-line max-len
function memoryPersistenceAdapter<T extends { id: I } & Record<string, any>, I = any>(initialData: T[] = []) {
  // not really a "persistence adapter", but it works for testing
  let items = [...initialData]
  let onChange: () => void | Promise<void> = () => { /* do nothing */ }
  return {
    register: (changeCallback: () => void | Promise<void>) => {
      onChange = changeCallback
      return Promise.resolve()
    },
    load: () => Promise.resolve({ items }),
    save: (newSnapshot: T[]) => {
      items = [...newSnapshot]
      return Promise.resolve()
    },
    addNewItem: (item: T) => {
      items.push(item)
      void onChange()
    },
  }
}

describe('Persistence', () => {
  it('should load items from persistence adapter', async () => {
    const persistence = memoryPersistenceAdapter([{ id: '1', name: 'John' }])
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')
    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'John' }])
  })

  it('should save items to persistence adapter', async () => {
    const persistence = memoryPersistenceAdapter()
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')
    collection.insert({ id: '1', name: 'John' })
    await waitForEvent(collection, 'persistence.transmitted')
    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'John' }])
    expect((await persistence.load()).items).toEqual([{ id: '1', name: 'John' }])
  })

  it('should get changes from persistence adapter', async () => {
    const persistence = memoryPersistenceAdapter([{ id: '1', name: 'John' }])
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')
    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'John' }])

    persistence.addNewItem({ id: '2', name: 'Jane' })
    await waitForEvent(collection, 'persistence.received')

    const newItems = collection.find().fetch()
    expect(newItems).toEqual([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ])
  })

  it('should remove item from persistence adapter', async () => {
    const persistence = memoryPersistenceAdapter([{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }])
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.removeOne({ id: '1' })
    await waitForEvent(collection, 'persistence.transmitted')

    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '2', name: 'Jane' }])
    expect((await persistence.load()).items).toEqual([{ id: '2', name: 'Jane' }])
  })

  it('should update item in persistence adapter', async () => {
    const persistence = memoryPersistenceAdapter([{ id: '1', name: 'John' }])
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.updateOne({ id: '1' }, { $set: { name: 'Johnny' } })
    await waitForEvent(collection, 'persistence.transmitted')

    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '1', name: 'Johnny' }])
    expect((await persistence.load()).items).toEqual([{ id: '1', name: 'Johnny' }])
  })

  it('should not modify original items in persistence adapter', async () => {
    const originalItems = [{ id: '1', name: 'John' }]
    const persistence = memoryPersistenceAdapter(originalItems)
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.insert({ id: '2', name: 'Jane' })
    await waitForEvent(collection, 'persistence.transmitted')

    expect(originalItems).toEqual([{ id: '1', name: 'John' }])
  })

  it('should handle multiple operations in order', async () => {
    const persistence = memoryPersistenceAdapter()
    const collection = new Collection({ persistence })
    await waitForEvent(collection, 'persistence.init')

    collection.insert({ id: '1', name: 'John' })
    await waitForEvent(collection, 'persistence.transmitted')
    collection.insert({ id: '2', name: 'Jane' })
    await waitForEvent(collection, 'persistence.transmitted')
    collection.removeOne({ id: '1' })
    await waitForEvent(collection, 'persistence.transmitted')

    const items = collection.find().fetch()
    expect(items).toEqual([{ id: '2', name: 'Jane' }])
    expect((await persistence.load()).items).toEqual([{ id: '2', name: 'Jane' }])
  })
})