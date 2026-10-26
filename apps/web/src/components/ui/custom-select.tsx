
"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";

export type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  id?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  placeholder,
  className = "",
}: CustomSelectProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listboxId = `${selectId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<
    Array<HTMLButtonElement | null>
  >([]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = options.findIndex(
    (option) => option.value === value,
  );

  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick,
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;

    optionRefs.current[activeIndex]?.focus();
  }, [isOpen, activeIndex]);

  const firstEnabledIndex = options.findIndex(
    (option) => !option.disabled,
  );

  const lastEnabledIndex = options.findLastIndex(
    (option) => !option.disabled,
  );

  function openDropdown(index?: number) {
    if (disabled) return;

    const initialIndex =
      index ??
      (selectedIndex >= 0 &&
      !options[selectedIndex].disabled
        ? selectedIndex
        : firstEnabledIndex);

    setActiveIndex(initialIndex);
    setIsOpen(true);
  }

  function closeDropdown() {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function selectOption(option: CustomSelectOption) {
    if (option.disabled) return;

    onChange(option.value);
    closeDropdown();
  }

  function moveActive(direction: 1 | -1) {
    if (options.length === 0) return;

    let nextIndex = activeIndex;

    for (let i = 0; i < options.length; i++) {
      nextIndex =
        (nextIndex + direction + options.length) %
        options.length;

      if (!options[nextIndex].disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  }

  function handleButtonKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
  ) {
    if (disabled) return;

    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openDropdown();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openDropdown(
        selectedIndex >= 0
          ? selectedIndex
          : lastEnabledIndex,
      );
    }

    if (event.key === "Home") {
      event.preventDefault();
      openDropdown(firstEnabledIndex);
    }

    if (event.key === "End") {
      event.preventDefault();
      openDropdown(lastEnabledIndex);
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDropdown();
      } else {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(firstEnabledIndex);
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(lastEnabledIndex);
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(options[index]);
    }
  }

  return (
    <div
      ref={rootRef}
      className={`relative w-full ${className}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {required ? (
        <input
          type="text"
          value={value}
          required
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      ) : null}

      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
          } else {
            openDropdown();
          }
        }}
        onKeyDown={handleButtonKeyDown}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 text-sm outline-none transition hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          dir="auto"
          className="min-w-0 truncate text-start"
        >
          {selectedOption?.label ?? placeholder ?? ""}
        </span>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={selectId}
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-xl"
        >
          {options.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => selectOption(option)}
              onKeyDown={(event) =>
                handleOptionKeyDown(event, index)
              }
              className={`block w-full rounded-md px-3 py-2 text-start text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-40 ${
                option.value === value
                  ? "bg-surface-muted font-semibold"
                  : "hover:bg-surface-muted"
              } focus:bg-surface-muted`}
            >
              <span dir="auto">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
