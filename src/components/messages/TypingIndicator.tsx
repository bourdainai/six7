import { motion } from "framer-motion";

interface TypingIndicatorProps {
  userName: string;
}

export const TypingIndicator = ({ userName }: TypingIndicatorProps) => {
  return (
    <div className="flex items-start mb-2">
      <div className="bg-muted/30 border border-border/50 rounded-md px-3.5 py-2.5 flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
