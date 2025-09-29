"use client";

import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useEffect } from "react";

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName
}) => {
  // split text inside of words into array of characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      // preserve original string for per-word styling decisions
      rawText: word.text,
      text: typeof word.text === "string" ? word.text.split("") : [],
    };
  });

  const [scope, animate] = useAnimate();
  const isInView = useInView(scope);
  useEffect(() => {
    if (isInView) {
      animate("span", {
        display: "inline-block",
        opacity: 1,
        width: "fit-content",
      }, {
        duration: 0.3,
        delay: stagger(0.1),
        ease: "easeInOut",
      });
    }
  }, [isInView]);

  const renderWords = () => {
    return (
      <motion.div ref={scope} className="inline-flex flex-wrap">
        {wordsArray.map((word, idx) => {
          return (
            <div
              key={`word-${idx}`}
              className={cn(
                "inline-block mr-2",
                // lowercase compare to make matching forgiving
                word.rawText && word.rawText.toLowerCase().includes("powered by tavily search + groqai")
                  ? "text-lg md:text-xl"
                  : "",
                word.className
              )}
            >
              {word.text.map((char, index) => (
                <motion.span
                  initial={{}}
                  key={`char-${idx}-${index}`}
                  className={cn(
                    `dark:text-white text-black opacity-0 hidden`,
                    // ensure char inherits smaller size when applied on container
                    word.rawText && word.rawText.toLowerCase().includes("powered by tavily search + groqai")
                      ? "leading-tight"
                      : "",
                    word.className
                  )}
                >
                  {char}
                </motion.span>
              ))}
            </div>
          );
        })}
      </motion.div>
    );
  };
  return (
    <div
      className={cn(
        "text-base sm:text-xl md:text-3xl lg:text-5xl font-bold text-center",
        className
      )}>
      {renderWords()}
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "inline-block rounded-sm w-[4px] h-4 md:h-6 lg:h-10 bg-blue-500",
          cursorClassName
        )}></motion.span>
    </div>
  );
};

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName
}) => {
  // split text inside of words into array of characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      rawText: word.text,
      text: typeof word.text === "string" ? word.text.split("") : [],
    };
  });
  const renderWords = () => {
    return (
      <div>
        {wordsArray.map((word, idx) => {
          return (
            <div
              key={`word-${idx}`}
              className={cn(
                "inline-block mr-2",
                word.rawText && word.rawText.toLowerCase().includes("poweredbytavilysearch+groqai")
                  ? "text-lg md:text-xl"
                  : "",
                word.className
              )}
            >
              {word.text.map((char, index) => (
                <span
                  key={`char-${idx}-${index}`}
                  className={cn(
                    `dark:text-white text-black `,
                    word.rawText && word.rawText.toLowerCase().includes("poweredbytavilysearch+groqai")
                      ? "leading-tight"
                      : "",
                    word.className
                  )}
                >
                  {char}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("flex space-x-1 my-6", className)}>
      <motion.div
        className="overflow-hidden pb-2"
        initial={{
          width: "0%",
        }}
        whileInView={{
          width: "fit-content",
        }}
        transition={{
          duration: 2,
          ease: "linear",
          delay: 1,
        }}>
        <div
          className={cn("text-sm md:text-base font-bold", className)}
          style={{
            whiteSpace: "normal",
          }}>
          {renderWords()}
        </div>
      </motion.div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,

          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "block rounded-sm w-[4px]  h-4 sm:h-6 xl:h-12 bg-blue-500",
          cursorClassName
        )}></motion.span>
    </div>
  );
};
