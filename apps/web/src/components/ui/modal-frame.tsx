"use client";

import { AnimatePresence, motion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

type ModalFrameProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayClassName: string;
  panelClassName: string;
  panelInitial: MotionProps["initial"];
  panelAnimate: MotionProps["animate"];
  panelExit: MotionProps["exit"];
  panelTransition?: MotionProps["transition"];
  panelRole?: string;
  panelAriaLabel?: string;
};

export function ModalFrame({
  isOpen,
  onClose,
  children,
  overlayClassName,
  panelClassName,
  panelInitial,
  panelAnimate,
  panelExit,
  panelTransition,
  panelRole,
  panelAriaLabel,
}: ModalFrameProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            data-motion-role="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={overlayClassName}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              data-motion-role="overlay"
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              transition={panelTransition}
              className={panelClassName}
              role={panelRole}
              aria-modal={panelRole === "dialog" ? "true" : undefined}
              aria-label={panelAriaLabel}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
