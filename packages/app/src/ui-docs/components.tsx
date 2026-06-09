import { Button } from '@/elements/actions/Button';
import { Input } from '@/elements/form/Input';
import { Textarea } from '@/elements/form/Textarea';
import { Checkbox } from '@/elements/form/Checkbox';
import { Switch } from '@/elements/form/Switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/elements/data/Card';
import { ScrollArea } from '@/elements/data/ScrollArea';
import { Badge } from '@/elements/feedback/Badge';
import { Progress } from '@/elements/feedback/Progress';
import { Skeleton, SkeletonAvatar } from '@/elements/feedback/Skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/elements/navigation/Tabs';

export interface UIDocsComponent {
  id: string;
  name: string;
  category: 'actions' | 'form' | 'feedback' | 'overlays' | 'navigation' | 'data';
  description: string;
  preview: React.ReactNode;
  documentation: string;
  props: Array<{
    name: string;
    type: string;
    default: string;
    description: string;
  }>;
  examples: Array<{
    title: string;
    description: string;
    code: string;
    component: React.ReactNode;
  }>;
}

export const uidocsComponents: UIDocsComponent[] = [
  // Actions
  {
    id: 'button',
    name: 'Button',
    category: 'actions',
    description: 'A clickable button that supports multiple variants and sizes.',
    preview: (
      <div className="flex gap-2">
        <Button variant="default">Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    ),
    documentation: `
The Button component is a fundamental UI element for user interactions. It supports multiple variants for different visual styles and sizes for different contexts.

**Features:**
- Multiple variants: default, outline, ghost, link, destructive
- Multiple sizes: sm, md, lg, icon
- Disabled state support
- Loading state support
    `,
    props: [
      { name: 'variant', type: "'default' | 'outline' | 'ghost' | 'link' | 'destructive'", default: "'default'", description: 'Visual style variant' },
      { name: 'size', type: "'sm' | 'md' | 'lg' | 'icon'", default: "'md'", description: 'Button size' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the button' },
      { name: 'className', type: 'string', default: 'undefined', description: 'Additional CSS classes' },
    ],
    examples: [
      {
        title: 'Button Variants',
        description: 'Different visual styles for buttons',
        code: `<Button variant="default">Default</Button>\n<Button variant="outline">Outline</Button>\n<Button variant="ghost">Ghost</Button>`,
        component: (
          <div className="flex gap-2">
            <Button variant="default">Default</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        ),
      },
      {
        title: 'Button Sizes',
        description: 'Different sizes for different contexts',
        code: `<Button size="sm">Small</Button>\n<Button size="md">Medium</Button>\n<Button size="lg">Large</Button>`,
        component: (
          <div className="flex gap-2 items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        ),
      },
    ],
  },
  // Form
  {
    id: 'input',
    name: 'Input',
    category: 'form',
    description: 'A text input field for user data entry.',
    preview: <Input placeholder="Enter text..." />,
    documentation: `
The Input component provides a styled text input field with consistent styling across the application.

**Features:**
- Border focus state
- Disabled state styling
- Error state support
- Placeholder text
    `,
    props: [
      { name: 'placeholder', type: 'string', default: 'undefined', description: 'Placeholder text' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the input' },
      { name: 'className', type: 'string', default: 'undefined', description: 'Additional CSS classes' },
    ],
    examples: [
      {
        title: 'Basic Input',
        description: 'Simple text input',
        code: '<Input placeholder="Enter your name" />',
        component: <Input placeholder="Enter your name" />,
      },
      {
        title: 'Disabled Input',
        description: 'Disabled state',
        code: '<Input disabled placeholder="Disabled input" />',
        component: <Input disabled placeholder="Disabled input" />,
      },
    ],
  },
  {
    id: 'textarea',
    name: 'Textarea',
    category: 'form',
    description: 'A multi-line text input for longer content.',
    preview: <Textarea placeholder="Enter multiple lines..." rows={3} />,
    documentation: `
The Textarea component provides a styled multi-line text input.

**Features:**
- Resizable (can be disabled)
- Custom row count
- Focus states
- Disabled state
    `,
    props: [
      { name: 'placeholder', type: 'string', default: 'undefined', description: 'Placeholder text' },
      { name: 'rows', type: 'number', default: '3', description: 'Number of visible rows' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the textarea' },
    ],
    examples: [
      {
        title: 'Basic Textarea',
        description: 'Simple multi-line input',
        code: '<Textarea placeholder="Enter your message" rows={4} />',
        component: <Textarea placeholder="Enter your message" rows={4} />,
      },
    ],
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'form',
    description: 'A checkbox input for boolean selections.',
    preview: <Checkbox label="Accept terms" />,
    documentation: `
The Checkbox component provides a styled checkbox with label support.

**Features:**
- Label integration
- Default checked state
- Disabled state
- Custom styling
    `,
    props: [
      { name: 'label', type: 'string', default: 'undefined', description: 'Checkbox label' },
      { name: 'defaultChecked', type: 'boolean', default: 'false', description: 'Initial checked state' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the checkbox' },
    ],
    examples: [
      {
        title: 'Basic Checkbox',
        description: 'Simple checkbox with label',
        code: '<Checkbox label="Remember me" />',
        component: <Checkbox label="Remember me" />,
      },
    ],
  },
  {
    id: 'switch',
    name: 'Switch',
    category: 'form',
    description: 'A toggle switch for on/off states.',
    preview: <Switch label="Notifications" />,
    documentation: `
The Switch component provides a styled toggle switch.

**Features:**
- Smooth animations
- Label support
- Default checked state
- Disabled state
    `,
    props: [
      { name: 'label', type: 'string', default: 'undefined', description: 'Switch label' },
      { name: 'defaultChecked', type: 'boolean', default: 'false', description: 'Initial state' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the switch' },
    ],
    examples: [
      {
        title: 'Basic Switch',
        description: 'Simple toggle switch',
        code: '<Switch label="Enable notifications" />',
        component: <Switch label="Enable notifications" />,
      },
    ],
  },
  // Feedback
  {
    id: 'badge',
    name: 'Badge',
    category: 'feedback',
    description: 'A small label for status or categorization.',
    preview: (
      <div className="flex gap-2">
        <Badge variant="default">Default</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
      </div>
    ),
    documentation: `
The Badge component provides status indicators and labels.

**Features:**
- Multiple variants: default, success, warning, error, info
- Compact size
- Custom styling
    `,
    props: [
      { name: 'variant', type: "'default' | 'success' | 'warning' | 'error' | 'info'", default: "'default'", description: 'Visual style variant' },
      { name: 'className', type: 'string', default: 'undefined', description: 'Additional CSS classes' },
    ],
    examples: [
      {
        title: 'Badge Variants',
        description: 'Different status styles',
        code: `<Badge variant="success">Success</Badge>\n<Badge variant="warning">Warning</Badge>`,
        component: (
          <div className="flex gap-2">
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        ),
      },
    ],
  },
  {
    id: 'progress',
    name: 'Progress',
    category: 'feedback',
    description: 'A progress bar for showing completion status.',
    preview: <Progress value={60} />,
    documentation: `
The Progress component shows completion status.

**Features:**
- Smooth animations
- Custom value
- Optional label
- Indeterminate state
    `,
    props: [
      { name: 'value', type: 'number', default: '0', description: 'Progress value (0-100)' },
      { name: 'label', type: 'string', default: 'undefined', description: 'Optional label text' },
      { name: 'className', type: 'string', default: 'undefined', description: 'Additional CSS classes' },
    ],
    examples: [
      {
        title: 'Progress Values',
        description: 'Different progress states',
        code: `<Progress value={25} />\n<Progress value={50} />\n<Progress value={75} />`,
        component: (
          <div className="space-y-2 w-full">
            <Progress value={25} />
            <Progress value={50} />
            <Progress value={75} />
          </div>
        ),
      },
    ],
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    category: 'feedback',
    description: 'Loading placeholder for content.',
    preview: (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ),
    documentation: `
The Skeleton component provides loading placeholders.

**Features:**
- Pulse animation
- Customizable size
- Multiple variants: text, circular, rectangular
- Pre-built components: SkeletonText, SkeletonAvatar
    `,
    props: [
      { name: 'animate', type: 'boolean', default: 'true', description: 'Enable pulse animation' },
      { name: 'className', type: 'string', default: 'undefined', description: 'Additional CSS classes' },
    ],
    examples: [
      {
        title: 'Skeleton Variants',
        description: 'Different loading patterns',
        code: `<SkeletonText lines={3} />\n<SkeletonAvatar />`,
        component: (
          <div className="flex items-center gap-4">
            <SkeletonAvatar />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ),
      },
    ],
  },
  // Data
  {
    id: 'card',
    name: 'Card',
    category: 'data',
    description: 'A container for grouping related content.',
    preview: (
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
      </Card>
    ),
    documentation: `
The Card component provides a flexible container for content grouping.

**Features:**
- Header section with title and description
- Content section
- Optional footer
- Multiple variants
- Border styling
    `,
    props: [
      { name: 'className', type: 'string', default: 'undefined', description: 'Additional CSS classes' },
    ],
    examples: [
      {
        title: 'Basic Card',
        description: 'Simple card with header and content',
        code: `<Card>\n  <CardHeader>\n    <CardTitle>Title</CardTitle>\n  </CardHeader>\n  <CardContent>Content</CardContent>\n</Card>`,
        component: (
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Example Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This is a card example with some content.</p>
            </CardContent>
          </Card>
        ),
      },
    ],
  },
  {
    id: 'scroll-area',
    name: 'ScrollArea',
    category: 'data',
    description: 'A container with custom scrollbar styling.',
    preview: (
      <ScrollArea className="h-32 w-48">
        <div className="p-4">
          <p>Scrollable content...</p>
          <p>Line 2</p>
          <p>Line 3</p>
          <p>Line 4</p>
          <p>Line 5</p>
        </div>
      </ScrollArea>
    ),
    documentation: `
The ScrollArea component provides consistent scrollbar styling.

**Features:**
- Custom scrollbar styling
- Smooth scrolling
- Overflow handling
- Responsive sizing
    `,
    props: [
      { name: 'className', type: 'string', default: 'undefined', description: 'Additional CSS classes' },
    ],
    examples: [
      {
        title: 'Scrollable Content',
        description: 'Content with custom scrollbar',
        code: `<ScrollArea className="h-40">\n  <div>Your content here</div>\n</ScrollArea>`,
        component: (
          <ScrollArea className="h-32 w-full max-w-sm">
            <div className="p-4 space-y-2">
              <p>Scrollable content line 1</p>
              <p>Scrollable content line 2</p>
              <p>Scrollable content line 3</p>
              <p>Scrollable content line 4</p>
              <p>Scrollable content line 5</p>
              <p>Scrollable content line 6</p>
            </div>
          </ScrollArea>
        ),
      },
    ],
  },
  // Navigation
  {
    id: 'tabs',
    name: 'Tabs',
    category: 'navigation',
    description: 'A tabbed interface for organizing content.',
    preview: (
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <div className="p-4">Content 1</div>
        </TabsContent>
        <TabsContent value="tab2">
          <div className="p-4">Content 2</div>
        </TabsContent>
      </Tabs>
    ),
    documentation: `
The Tabs component provides a tabbed interface using Radix UI primitives.

**Features:**
- Keyboard navigation
- Accessibility support
- Animated transitions
- Multiple tabs support
    `,
    props: [
      { name: 'defaultValue', type: 'string', default: 'undefined', description: 'Initially active tab' },
    ],
    examples: [
      {
        title: 'Basic Tabs',
        description: 'Simple tabbed interface',
        code: `<Tabs defaultValue="tab1">\n  <TabsList>\n    <TabsTrigger value="tab1">Tab 1</TabsTrigger>\n    <TabsTrigger value="tab2">Tab 2</TabsTrigger>\n  </TabsList>\n  <TabsContent value="tab1">Content 1</TabsContent>\n  <TabsContent value="tab2">Content 2</TabsContent>\n</Tabs>`,
        component: (
          <Tabs defaultValue="tab1" className="w-full">
            <TabsList>
              <TabsTrigger value="tab1">Overview</TabsTrigger>
              <TabsTrigger value="tab2">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <div className="p-4">Overview content</div>
            </TabsContent>
            <TabsContent value="tab2">
              <div className="p-4">Details content</div>
            </TabsContent>
          </Tabs>
        ),
      },
    ],
  },
];
