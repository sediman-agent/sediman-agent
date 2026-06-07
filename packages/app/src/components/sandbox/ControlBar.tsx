import { User, Bot, Loader2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/elements/actions/Button';
import type { SandboxType, ControlMode } from '@/stores/useSandboxStore';

interface ControlBarProps {
  sandboxType: SandboxType;
  controlMode: ControlMode;
  isStarting: boolean;
  isStopping: boolean;
  isActive: boolean;
  onControlModeChange: (mode: ControlMode) => void;
  onStart: () => void;
  onStop: () => void;
}

export function ControlBar({
  sandboxType,
  controlMode,
  isStarting,
  isStopping,
  isActive,
  onControlModeChange,
  onStart,
  onStop,
}: ControlBarProps) {
  return (
    <div className="h-11 flex items-center justify-between px-4 border-b border-border bg-background transition-colors duration-200">
      <SandboxTypeSelector currentType={sandboxType} onChange={() => {}} />
      <div className="flex items-center gap-2">
        {isActive && (
          <ControlModeToggle
            currentMode={controlMode}
            onChange={onControlModeChange}
          />
        )}
        <StartStopButton
          isActive={isActive}
          isStarting={isStarting}
          isStopping={isStopping}
          onStart={onStart}
          onStop={onStop}
        />
      </div>
    </div>
  );
}

interface SandboxTypeSelectorProps {
  currentType: SandboxType;
  onChange: (type: SandboxType) => void;
}

function SandboxTypeSelector({ currentType: _unusedType }: SandboxTypeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-md bg-background border border-border">
      <div className="px-2 py-1 text-xs font-medium text-foreground">
        Browser
      </div>
    </div>
  );
}

interface ControlModeToggleProps {
  currentMode: ControlMode;
  onChange: (mode: ControlMode) => void;
}

function ControlModeToggle({ currentMode, onChange }: ControlModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-md bg-background border border-border">
      <ModeButton
        mode="agent"
        currentMode={currentMode}
        onChange={onChange}
        icon={<Bot className="w-3 h-3 mr-1" />}
        label="Agent"
      />
      <ModeButton
        mode="user"
        currentMode={currentMode}
        onChange={onChange}
        icon={<User className="w-3 h-3 mr-1" />}
        label="User"
      />
    </div>
  );
}

interface ModeButtonProps {
  mode: ControlMode;
  currentMode: ControlMode;
  onChange: (mode: ControlMode) => void;
  icon: React.ReactNode;
  label: string;
}

function ModeButton({ mode, currentMode, onChange, icon, label }: ModeButtonProps) {
  const isActive = currentMode === mode;
  return (
    <Button
      size="sm"
      variant={isActive ? 'secondary' : 'ghost'}
      onClick={() => onChange(mode)}
      className="h-7 px-2 text-xs font-medium transition-all duration-200"
      style={isActive ? {} : undefined}
    >
      {icon}
      {label}
    </Button>
  );
}

interface StartStopButtonProps {
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  onStart: () => void;
  onStop: () => void;
}

function StartStopButton({
  isActive,
  isStarting,
  isStopping,
  onStart,
  onStop,
}: StartStopButtonProps) {
  const disabled = isStarting || isStopping;
  const variant = isActive ? 'destructive' : 'default';
  const onClick = isActive ? onStop : onStart;
  const { icon, label } = getButtonContent({ isActive, isStarting, isStopping });

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={`
        h-7 px-3 text-xs font-medium
        transition-all duration-200
        ${!disabled ? 'hover-lift' : 'cursor-not-allowed opacity-50'}
      `}
    >
      {icon}
      {label}
    </Button>
  );
}

interface ButtonContent {
  icon: React.ReactNode;
  label: string;
}

function getButtonContent({ isActive, isStarting, isStopping }: { isActive: boolean; isStarting: boolean; isStopping: boolean }): ButtonContent {
  if (isStarting) {
    return {
      icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
      label: 'Starting...',
    };
  }

  if (isStopping) {
    return {
      icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
      label: 'Stopping...',
    };
  }

  if (isActive) {
    return {
      icon: <PowerOff className="w-3 h-3 mr-1" />,
      label: 'Stop',
    };
  }

  return {
    icon: <Power className="w-3 h-3 mr-1" />,
    label: 'Start',
  };
}
