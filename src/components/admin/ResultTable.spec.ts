import { expect, test, describe, beforeEach } from 'vitest';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import ResultTable from './ResultTable.vue';
import type { Headers } from '@/components/admin/ResultTable.vue';
import type { Component } from 'vue';

let wrapper: VueWrapper | null = null;

const mockItems: {
  id: number;
  name: string;
}[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  type ReadonlyHeaders = Headers;
  const headers: ReadonlyHeaders = [{ title: 'Name', key: 'name', align: 'start' }];

  wrapper = mount(ResultTable, {
    attachTo: document.getElementById('app') || '',
    props: {
      items: mockItems,
      itemsPerPage: 10,
      loading: false,
      totalItems: 25,
      headers: headers,
      itemValuePath: 'id',
      disableRowClick: false,
      currentSort: {
        key: 'name',
        order: 'asc',
      },
    },
    global: {
      components: {
        ResultTable: ResultTable as Component,
      },
    },
  });
});

describe('Row Index and Item Retrieval', () => {
  test('manually find row index in DOM and match corresponding item', () => {
    // Simulate getting rows and finding index
    const tbody: DOMWrapper<HTMLTableSectionElement> | undefined = wrapper?.find('tbody');
    const rows: DOMWrapper<HTMLTableRowElement>[] | undefined = tbody?.findAll('tr');

    // Verify we have correct number of rows matching mock items
    expect(rows?.length).toBe(mockItems.length);

    rows?.forEach((row: DOMWrapper<HTMLTableRowElement>, domIndex: number) => {
      // Convert row to raw DOM element
      const rowElement: HTMLTableRowElement = row.element;

      // Simulate finding parent and converting to array
      const rowsArray: Element[] = Array.from(rowElement.parentElement!.children);

      // Find index of current row
      const calculatedIndex: number = rowsArray.indexOf(rowElement);

      // Verify calculated index matches expected DOM index
      expect(calculatedIndex).toBe(domIndex);

      // Verify item retrieval matches our mock data
      // This simulates the logic in the component
      const retrievedItem:
        | {
            id: number;
            name: string;
          }
        | undefined = mockItems[calculatedIndex];
      expect(retrievedItem).toEqual(mockItems[domIndex]);
    });
  });

  test('row index matches item array order', () => {
    const tbody: DOMWrapper<HTMLTableSectionElement> | undefined = wrapper?.find('tbody');
    const rows: DOMWrapper<HTMLTableRowElement>[] | undefined = tbody?.findAll('tr');

    rows?.forEach((row: DOMWrapper<HTMLTableRowElement>, index: number) => {
      const rowElement: HTMLTableRowElement = row.element;
      const rowsArray: Element[] = Array.from(rowElement.parentElement!.children);
      const calculatedIndex: number = rowsArray.indexOf(rowElement);

      expect(calculatedIndex).toBe(index);
    });
  });

  test('handles empty items array', () => {
    // Remount with empty items
    wrapper = mount(ResultTable, {
      props: {
        items: [],
        itemsPerPage: 10,
        loading: false,
        totalItems: 0,
        headers: [{ title: 'Name', key: 'name', align: 'start' }],
        itemValuePath: 'id',
        disableRowClick: false,
      },
    });

    const tbody: DOMWrapper<HTMLTableSectionElement> = wrapper.find('tbody');
    const rows: DOMWrapper<HTMLTableRowElement>[] = tbody.findAll('tr');

    // Use the prop passed to the component to check for no data
    const noDataText: string | undefined = wrapper.find('[data-testid="result-table"]').attributes('no-data-text');

    // Either no rows or only a single "no data" row
    expect(rows.length).toBeLessThanOrEqual(1);

    // Optional: Check for specific no data text if needed
    if (rows.length === 1) {
      expect(rows[0]?.text()).toContain(noDataText || 'noDataFound');
    }
  });

  test('emits update:selectedRows event with selected item values', () => {
    const selectedItems: number[] = [1, 2];
    const table: VueWrapper | undefined = wrapper?.findComponent({ ref: 'v-data-table-server' });
    table?.vm.$emit('update:modelValue', selectedItems);

    expect(wrapper?.emitted('update:selectedRows')).toBeTruthy();
    expect(wrapper?.emitted('update:selectedRows')?.[0]).toEqual([selectedItems]);
  });
});

describe('Sorting', () => {
  test('onUpdateOptions emits correct sort options', () => {
    const sortOptions: { key: string; order: string }[] = [{ key: 'kennung', order: 'asc' }];
    const table: VueWrapper | undefined = wrapper?.findComponent({ ref: 'v-data-table-server' });

    // Simulate the update:sortBy event
    table?.vm.$emit('update:sortBy', sortOptions);

    // Verify the emitted event
    expect(wrapper?.emitted('onTableUpdate')).toBeTruthy();
    expect(wrapper?.emitted('onTableUpdate')?.[0]).toEqual([{ sortField: 'kennung', sortOrder: 'asc' }]);
  });

  test('onUpdateOptions emits default sort options when no options are provided', () => {
    const table: VueWrapper | undefined = wrapper?.findComponent({ ref: 'v-data-table-server' });

    // Simulate the update:sortBy event with an empty array
    table?.vm.$emit('update:sortBy', []);

    // Verify the emitted event
    expect(wrapper?.emitted('onTableUpdate')).toBeTruthy();
    expect(wrapper?.emitted('onTableUpdate')?.[0]).toEqual([{ sortField: 'name', sortOrder: 'asc' }]);
  });
});
