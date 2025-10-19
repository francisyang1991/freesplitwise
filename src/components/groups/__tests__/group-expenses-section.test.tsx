import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupExpensesSection } from '../group-expenses-section';
import type { GroupMemberInfo } from '@/lib/group-serializers';
import type { ExpenseSummary } from '@/lib/expense-serializers';

// Mock the currency utilities
jest.mock('@/lib/currency', () => ({
  formatCurrency: (amount: number) => `$${(amount / 100).toFixed(2)}`,
  parseCurrencyToCents: (value: unknown) => {
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : Math.round(parsed * 100);
    }
    if (typeof value === 'number') {
      return Math.round(value * 100);
    }
    return null;
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockMembers: GroupMemberInfo[] = [
  {
    membershipId: 'member1',
    userId: 'user1',
    role: 'OWNER',
    name: 'Alice',
    email: 'alice@example.com',
    image: null,
    joinedAt: '2024-01-01T00:00:00Z',
  },
  {
    membershipId: 'member2',
    userId: 'user2',
    role: 'MEMBER',
    name: 'Bob',
    email: 'bob@example.com',
    image: null,
    joinedAt: '2024-01-01T00:00:00Z',
  },
  {
    membershipId: 'member3',
    userId: 'user3',
    role: 'MEMBER',
    name: 'Charlie',
    email: 'charlie@example.com',
    image: null,
    joinedAt: '2024-01-01T00:00:00Z',
  },
];

const mockCurrentMember: GroupMemberInfo = mockMembers[0];

const mockExpenses: ExpenseSummary[] = [];

describe('GroupExpensesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('should render expense form', () => {
    render(
      <GroupExpensesSection
        groupId="test-group"
        currency="USD"
        members={mockMembers}
        initialExpenses={mockExpenses}
        currentMember={mockCurrentMember}
      />
    );

    expect(screen.getByText('Add expense')).toBeInTheDocument();
  });

  it('should open expense form when add button is clicked', () => {
    render(
      <GroupExpensesSection
        groupId="test-group"
        currency="USD"
        members={mockMembers}
        initialExpenses={mockExpenses}
        currentMember={mockCurrentMember}
      />
    );

    const addButton = screen.getByText('Add expense');
    fireEvent.click(addButton);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Total amount (USD)')).toBeInTheDocument();
  });

  describe('Split equally checkbox behavior', () => {
    it('should not change payment assignments when toggling inclusion checkbox', async () => {
      render(
        <GroupExpensesSection
          groupId="test-group"
          currency="USD"
          members={mockMembers}
          initialExpenses={mockExpenses}
          currentMember={mockCurrentMember}
        />
      );

      // Open expense form
      const addButton = screen.getByText('Add expense');
      fireEvent.click(addButton);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Fill in expense details
      const descriptionInput = screen.getByLabelText('Description');
      const totalAmountInput = screen.getByLabelText('Total amount (USD)');
      
      fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
      fireEvent.change(totalAmountInput, { target: { value: '30.00' } });

      // Wait for auto-distribution to occur
      await waitFor(() => {
        const checkboxes = screen.getAllByLabelText(/Include .* in split/);
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      const memberCheckboxes = screen.getAllByLabelText(/Include .* in split/);

      // Toggle inclusion for the second member (Bob)
      const bobCheckbox = memberCheckboxes[1];
      
      // Get initial state
      const initialChecked = (bobCheckbox as HTMLInputElement).checked;
      
      // Toggle the checkbox
      fireEvent.click(bobCheckbox);
      
      // Wait for state update
      await waitFor(() => {
        // The checkbox state should have changed
        expect((bobCheckbox as HTMLInputElement).checked).toBe(!initialChecked);
      });

      // The payment assignments should not be affected by inclusion changes
      // This is tested by ensuring the form still renders correctly
      expect(screen.getByDisplayValue('Test expense')).toBeInTheDocument();
      
      // Verify "Paid total" is correct - should match the total amount
      expect(screen.getByText('Paid total: $30.00')).toBeInTheDocument();
    });

    it('should preserve manual payment entries when toggling inclusion', async () => {
      render(
        <GroupExpensesSection
          groupId="test-group"
          currency="USD"
          members={mockMembers}
          initialExpenses={mockExpenses}
          currentMember={mockCurrentMember}
        />
      );

      // Open expense form
      const addButton = screen.getByText('Add expense');
      fireEvent.click(addButton);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Fill in expense details
      const descriptionInput = screen.getByLabelText('Description');
      const totalAmountInput = screen.getByLabelText('Total amount (USD)');
      
      fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
      fireEvent.change(totalAmountInput, { target: { value: '30.00' } });

      // Wait for form to be ready
      await waitFor(() => {
        const checkboxes = screen.getAllByLabelText(/Include .* in split/);
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      const memberCheckboxes = screen.getAllByLabelText(/Include .* in split/);

      // Toggle inclusion for Bob
      const bobCheckbox = memberCheckboxes[1];
      const initialChecked = (bobCheckbox as HTMLInputElement).checked;
      
      fireEvent.click(bobCheckbox);
      
      // Wait for state update
      await waitFor(() => {
        expect((bobCheckbox as HTMLInputElement).checked).toBe(!initialChecked);
      });

      // The form should still be functional after inclusion changes
      expect(screen.getByDisplayValue('Test expense')).toBeInTheDocument();
      
      // Verify "Paid total" is correct - should match the total amount
      expect(screen.getByText('Paid total: $30.00')).toBeInTheDocument();
    });

    it('should handle select all functionality without changing payment assignments', async () => {
      render(
        <GroupExpensesSection
          groupId="test-group"
          currency="USD"
          members={mockMembers}
          initialExpenses={mockExpenses}
          currentMember={mockCurrentMember}
        />
      );

      // Open expense form
      const addButton = screen.getByText('Add expense');
      fireEvent.click(addButton);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Fill in expense details
      const descriptionInput = screen.getByLabelText('Description');
      const totalAmountInput = screen.getByLabelText('Total amount (USD)');
      
      fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
      fireEvent.change(totalAmountInput, { target: { value: '30.00' } });

      // Wait for form to be ready
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      // Find select all button (not checkbox)
      const selectAllButton = screen.getByText('Deselect all');
      
      // Click select all to deselect
      fireEvent.click(selectAllButton);
      
      // Wait for state update
      await waitFor(() => {
        // Button text should change
        expect(screen.getByText('Select all')).toBeInTheDocument();
      });

      // Click again to select all
      fireEvent.click(screen.getByText('Select all'));
      
      // Wait for state update
      await waitFor(() => {
        // Button text should change back
        expect(screen.getByText('Deselect all')).toBeInTheDocument();
      });

      // The form should still be functional after select all changes
      expect(screen.getByDisplayValue('Test expense')).toBeInTheDocument();
      
      // Verify "Paid total" is correct - should match the total amount
      expect(screen.getByText('Paid total: $30.00')).toBeInTheDocument();
    });
  });

  describe('Paid total calculation', () => {
    it('should display correct paid total that matches total amount', async () => {
      render(
        <GroupExpensesSection
          groupId="test-group"
          currency="USD"
          members={mockMembers}
          initialExpenses={mockExpenses}
          currentMember={mockCurrentMember}
        />
      );

      // Open expense form
      const addButton = screen.getByText('Add expense');
      fireEvent.click(addButton);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Fill in expense details
      const descriptionInput = screen.getByLabelText('Description');
      const totalAmountInput = screen.getByLabelText('Total amount (USD)');
      
      fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
      fireEvent.change(totalAmountInput, { target: { value: '150.00' } });

      // Wait for auto-distribution to occur
      await waitFor(() => {
        // Check that paid total matches the total amount
        expect(screen.getByText('Paid total: $150.00')).toBeInTheDocument();
      });

      // Verify the calculation is correct
      const paidTotalElement = screen.getByText('Paid total: $150.00');
      expect(paidTotalElement).toBeInTheDocument();
    });

    it('should update paid total when total amount changes', async () => {
      render(
        <GroupExpensesSection
          groupId="test-group"
          currency="USD"
          members={mockMembers}
          initialExpenses={mockExpenses}
          currentMember={mockCurrentMember}
        />
      );

      // Open expense form
      const addButton = screen.getByText('Add expense');
      fireEvent.click(addButton);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Fill in initial amount
      const descriptionInput = screen.getByLabelText('Description');
      const totalAmountInput = screen.getByLabelText('Total amount (USD)');
      
      fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
      fireEvent.change(totalAmountInput, { target: { value: '100.00' } });

      // Wait for initial calculation
      await waitFor(() => {
        expect(screen.getByText('Paid total: $100.00')).toBeInTheDocument();
      });

      // Change the total amount
      fireEvent.change(totalAmountInput, { target: { value: '200.00' } });

      // Wait for updated calculation
      await waitFor(() => {
        expect(screen.getByText('Paid total: $200.00')).toBeInTheDocument();
      });
    });

    it('should handle edge case where paid total might be wrong', async () => {
      render(
        <GroupExpensesSection
          groupId="test-group"
          currency="USD"
          members={mockMembers}
          initialExpenses={mockExpenses}
          currentMember={mockCurrentMember}
        />
      );

      // Open expense form
      const addButton = screen.getByText('Add expense');
      fireEvent.click(addButton);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Fill in expense details with a specific amount that might cause issues
      const descriptionInput = screen.getByLabelText('Description');
      const totalAmountInput = screen.getByLabelText('Total amount (USD)');
      
      fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
      fireEvent.change(totalAmountInput, { target: { value: '285.00' } });

      await waitFor(() => {
        expect(screen.getByText('Paid total: $285.00')).toBeInTheDocument();
      });
    });

    it('should correctly update paid total when changing payer', async () => {
      render(
        <GroupExpensesSection
          groupId="test-group"
          currency="USD"
          members={mockMembers}
          initialExpenses={mockExpenses}
          currentMember={mockCurrentMember}
        />
      );

      // Open expense form
      const addButton = screen.getByText('Add expense');
      fireEvent.click(addButton);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      // Fill in expense details
      const descriptionInput = screen.getByLabelText('Description');
      const totalAmountInput = screen.getByLabelText('Total amount (USD)');
      
      fireEvent.change(descriptionInput, { target: { value: 'Test expense' } });
      fireEvent.change(totalAmountInput, { target: { value: '100.00' } });

      // Wait for initial calculation
      await waitFor(() => {
        expect(screen.getByText('Paid total: $100.00')).toBeInTheDocument();
      });

      // Click Change button to open payer modal
      const changeButton = screen.getByText('Change');
      fireEvent.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText('Select payers')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Toggle Bob as payer'));

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.queryByText('Select payers')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Paid total: $100.00')).toBeInTheDocument();
      expect(screen.getByText(/Paid by/)).toHaveTextContent('Paid by you & Bob');
    });
  });
});

describe('Payer selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('allows selecting multiple payers via checkboxes', async () => {
    render(
      <GroupExpensesSection
        groupId="test-group"
        currency="USD"
        members={mockMembers}
        initialExpenses={mockExpenses}
        currentMember={mockCurrentMember}
      />
    );

    fireEvent.click(screen.getByText('Add expense'));

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Dinner' } });
    fireEvent.change(screen.getByLabelText('Total amount (USD)'), { target: { value: '100.00' } });

    fireEvent.click(screen.getByText('Change'));

    await waitFor(() => {
      expect(screen.getByText('Select payers')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Toggle Bob as payer'));
    fireEvent.click(screen.getByLabelText('Toggle Charlie as payer'));

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.queryByText('Select payers')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Paid total: $100.00')).toBeInTheDocument();
    expect(screen.getByText(/Paid by/)).toHaveTextContent('Paid by you +2');
  });

  it('ensures at least one payer remains selected', async () => {
    render(
      <GroupExpensesSection
        groupId="test-group"
        currency="USD"
        members={mockMembers}
        initialExpenses={mockExpenses}
        currentMember={mockCurrentMember}
      />
    );

    fireEvent.click(screen.getByText('Add expense'));

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Dinner' } });
    fireEvent.change(screen.getByLabelText('Total amount (USD)'), { target: { value: '100.00' } });

    fireEvent.click(screen.getByText('Change'));

    await waitFor(() => {
      expect(screen.getByText('Select payers')).toBeInTheDocument();
    });

    const payerCheckboxes = screen.getAllByLabelText(/Toggle .* as payer/);
    payerCheckboxes.forEach((checkbox) => {
      if ((checkbox as HTMLInputElement).checked) {
        fireEvent.click(checkbox);
      }
    });

    const aliceCheckbox = screen.getByLabelText('Toggle Alice as payer') as HTMLInputElement;
    expect(aliceCheckbox.checked).toBe(true);
    expect(screen.getAllByText('Paid total: $100.00')).toHaveLength(2);

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.queryByText('Select payers')).not.toBeInTheDocument();
    });
  });

  it('allows selecting and deselecting individual payers freely', async () => {
    render(
      <GroupExpensesSection
        groupId="test-group"
        currency="USD"
        members={mockMembers}
        initialExpenses={mockExpenses}
        currentMember={mockCurrentMember}
      />
    );

    fireEvent.click(screen.getByText('Add expense'));

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Dinner' } });
    fireEvent.change(screen.getByLabelText('Total amount (USD)'), { target: { value: '100.00' } });

    fireEvent.click(screen.getByText('Change'));

    await waitFor(() => {
      expect(screen.getByText('Select payers')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Toggle Bob as payer'));
    expect(screen.getAllByText('Paid total: $100.00')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Toggle Bob as payer'));
    expect(screen.getAllByText('Paid total: $100.00')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Toggle Charlie as payer'));
    expect(screen.getAllByText('Paid total: $100.00')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Toggle Bob as payer'));
    expect(screen.getAllByText('Paid total: $100.00')).toHaveLength(2);

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.queryByText('Select payers')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Paid total: $100.00')).toBeInTheDocument();
  });
});
