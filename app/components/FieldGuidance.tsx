"use client";
import { cloneElement, useId, useState, type InputHTMLAttributes, type ReactElement } from "react";

export default function FieldGuidance({ children, error, help, showError = false }: { children: ReactElement<InputHTMLAttributes<HTMLInputElement>>; error?: string | false; help?: string; showError?: boolean }) {
  const [touched, setTouched] = useState(false);
  const [nativeError, setNativeError] = useState("");
  const id = useId();
  const activeError = error || nativeError;
  const visibleError = (touched || showError) && activeError;
  const message = visibleError || help;
  const description = [children.props["aria-describedby"], message && id].filter(Boolean).join(" ") || undefined;
  return <span className="block">{cloneElement(children, {
    "aria-describedby": description,
    "aria-invalid": Boolean(visibleError) ? true : children.props["aria-invalid"],
    onBlur: event => { setTouched(true); setNativeError(nativeValidationMessage(event.currentTarget)); children.props.onBlur?.(event); },
    onChange: event => { if (touched || showError) setNativeError(nativeValidationMessage(event.currentTarget)); children.props.onChange?.(event); },
    onInvalid: event => { setTouched(true); setNativeError(nativeValidationMessage(event.currentTarget)); children.props.onInvalid?.(event); },
  })}{message && <span id={id} className={`mt-1 block text-xs font-normal leading-5 ${visibleError ? "text-red-700" : "text-slate-500"}`}>{message}</span>}</span>;
}

function nativeValidationMessage(input: HTMLInputElement) {
  const validity = input.validity;
  if (validity.valid) return "";
  if (validity.valueMissing) return "Completa este campo.";
  if (validity.rangeOverflow) return input.type === "date" ? `La fecha no debe ser posterior a ${input.max}.` : `El importe no debe superar ${input.max}.`;
  if (validity.rangeUnderflow) return `Ingresa un valor de al menos ${input.min}.`;
  if (validity.stepMismatch || validity.badInput || validity.typeMismatch) return "Revisa el formato del valor ingresado.";
  return "Revisa este campo antes de guardar.";
}
