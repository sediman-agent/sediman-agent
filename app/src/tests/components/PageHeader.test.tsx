import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Settings } from 'lucide-react';

describe('PageHeader', () => {
  it('renders title correctly', () => {
    render(<PageHeader title="Test Page" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <PageHeader title="Test Page" subtitle="This is a test subtitle" />
    );
    expect(screen.getByText('This is a test subtitle')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<PageHeader title="Test Page" />);
    const subtitle = screen.queryByText('This is a test subtitle');
    expect(subtitle).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <PageHeader title="Test Page" icon={Settings} />
    );
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <PageHeader
        title="Test Page"
        actions={<button data-testid="test-action">Action</button>}
      />
    );
    expect(screen.getByTestId('test-action')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PageHeader title="Test Page" className="custom-class" />
    );
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('custom-class');
  });

  it('has correct base styling classes', () => {
    const { container } = render(<PageHeader title="Test Page" />);
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('h-10');
    expect(header).toHaveClass('border-b');
    expect(header).toHaveClass('px-3');
  });

  it('title has correct text styling', () => {
    render(<PageHeader title="Test Page" />);
    const title = screen.getByText('Test Page');
    expect(title).toHaveClass('text-xs');
    expect(title).toHaveClass('font-medium');
  });

  it('subtitle has correct text styling', () => {
    render(
      <PageHeader title="Test Page" subtitle="Test subtitle" />
    );
    const subtitle = screen.getByText('Test subtitle');
    expect(subtitle).toHaveClass('text-[10px]');
    expect(subtitle).toHaveClass('text-muted-foreground');
  });

  it('icon has correct size styling', () => {
    const { container } = render(
      <PageHeader title="Test Page" icon={Settings} />
    );
    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('w-3.5');
    expect(icon).toHaveClass('h-3.5');
  });
});
