"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
  MdOutlineShare,
  MdOutlineEmojiEmotions,
  MdOutlineSettings,
  MdOutlinedFlag,
  MdAdd,
} from "react-icons/md";
import { BsArrowRepeat } from "react-icons/bs";
import { Message } from "@/public/utils/types";
import { useBoardStore } from "@/app/store";
import { Tabs, Tab, Button, useDisclosure, Spinner } from "@nextui-org/react";
import { GameModal, SettingsModal } from ".";
import toast from "react-hot-toast";

// Utility: Format moves array as PGN string (simple version)
function movesToPGN(moves: string[]) {
  let pgn = "";
  for (let i = 0; i < moves.length; i += 2) {
    pgn += `${Math.floor(i / 2) + 1}. ${moves[i]}${moves[i + 1] ? " " + moves[i + 1] : ""} `;
  }
  return pgn.trim();
}

// Utility: Checks if user is asking for move suggestion or making a chess-related query
function isChessQuery(msg: string) {
  // If query contains move/suggest/next/recommend/good/opening or chess terms, send moves context
  const keywords = [
    "move",
    "suggest",
    "next",
    "recommend",
    "good",
    "opening",
    "play",
    "checkmate",
    "strategy",
    "chess"
  ];
  return keywords.some((word) => msg.toLowerCase().includes(word));
}

interface SideBoardProps {
  onSendMessage: (message: string) => void;
  messages: Message[];
}

const SideBoardComponent: React.FC<SideBoardProps> = ({
  onSendMessage,
  messages,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [message, setMessage] = useState("");
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  // Explicit cast for type safety from Zustand store (String[] to string[])
  const moves = useBoardStore((state) => state.moves as string[]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showGameModal, setShowGameModal] = useState(false);
  const gameOver = useBoardStore((state) => state.gameOver);
  const setGameOver = useBoardStore((state) => state.setGameOver);
  const onNewGame = useBoardStore((state) => state.onNewGame);
  const gameResult = useBoardStore((state) => state.gameResult);
  const currentFEN = useBoardStore((state) => state.currentFEN);
  const router = useRouter();

  // AI state
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiPickerRef]);

  const handleEmojiClick = (emojiObject: { emoji: any }) => {
    const emoji = emojiObject.emoji;
    setMessage((prevMessage) => prevMessage + emoji);
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      await handleSend(message);
      setMessage("");
    }
  };

  // Send message, always send to AI, but if chess-related send context
  const handleSend = async (msg: string) => {
    if (!msg.trim()) return;

    setAiLoading(true);

    // Add user query to chat
    onSendMessage(msg);

    try {
      let aiPrompt = "";

      if (isChessQuery(msg)) {
        // If the message is chess related, send moves and FEN for context
        aiPrompt = `
You are an expert chess assistant. The user is playing a chess game. Here is the current position in FEN:
${currentFEN}
Here is the move history (algebraic notation):
${movesToPGN(moves)}
User's message: "${msg}"

If the user asks for a move, only suggest one best move in algebraic notation and explain briefly. If the message is general chess strategy (not a move), answer helpfully. If it's not chess-related, politely say so.
        `;
      } else {
        // General chat, just forward the user's message
        aiPrompt = `
You are an expert chess assistant. The user says: "${msg}"

If the message is chess-related, help accordingly. If not, politely say you only answer chess-related queries.
        `;
      }

      // API call to our backend (Next.js API route)
      const response = await fetch("/api/chess-move-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: [{ type: "text", text: aiPrompt }] }
          ]
        }),
      });

      const data = await response.json();
      const aiText = data?.suggestion || "Sorry, I couldn't find a suggestion.";
      onSendMessage(`[AI Suggestion]: ${aiText}`);
    } catch (err) {
      onSendMessage("[AI Suggestion]: Sorry, AI suggestion failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleLikeButtonClick = () => {
    navigator.clipboard.writeText(currentFEN).then(() => {
      toast.success("Pgn Copied!");
    });
  };

  return (
    <>
      <div className="h-full w-full sm:w-3/4 sm:h-[95%] bg-slate-900 sm:my-4 my-1 rounded-md flex flex-col">
        <Tabs key="underlined" variant="underlined" aria-label="Tabs">
          <Tab key="moves" title="Moves">
            {/* Moves Section */}
            <div className="flex flex-col space-y-2 overflow-y-auto max-h-[460px]">
              <ol className="px-4 list-decimal list-inside">
                {moves.map(
                  (move, index) =>
                    index % 2 === 0 && (
                      <li key={index / 2} className="font-semibold">
                        <span className="text-blue-400 mx-4">{move}</span>
                        {index + 1 < moves.length && (
                          <span className="text-yellow-400 mx-4">
                            {moves[index + 1]}
                          </span>
                        )}
                      </li>
                    )
                )}
              </ol>
            </div>
          </Tab>
          <Tab key="chat" title="Chat" className="flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto max-h-[480px] px-4 py-1">
              <div className="flex flex-col-reverse space-y-1">
                {aiLoading && (
                  <div className="flex items-start">
                    <span className="text-yellow-400">AI:</span>
                    <span className="px-1">
                      <Spinner size="sm" color="warning" /> Thinking...
                    </span>
                  </div>
                )}
                {messages
                  .slice()
                  .reverse()
                  .map((msg, index) => (
                    <div key={index} className="flex items-start">
                      <span
                        className={
                          msg.content.startsWith("[AI Suggestion]:")
                            ? "text-purple-400"
                            : "text-yellow-400"
                        }
                      >
                        {msg.username || (msg.content.startsWith("[AI Suggestion]:") ? "AI" : "")}:
                      </span>
                      <span className="px-1">
                        {msg.content.replace("[AI Suggestion]:", "")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            {/* Chat Input */}
            <div className="mt-auto relative" ref={emojiPickerRef}>
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-4 py-2 bg-slate-900 text-white border-t-[1px] border-gray-600 focus:outline-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyUp={handleKeyPress}
                disabled={aiLoading}
              />

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={"dark" as Theme}
                  />
                </div>
              )}

              {/* Smiley Icon */}
              <MdOutlineEmojiEmotions
                size={20}
                className="absolute bottom-3 right-3 cursor-pointer"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              />
            </div>
          </Tab>
        </Tabs>
        <div className="mt-auto rounded-md bg-slate-950 py-2 flex flex-col">
          {gameOver && (
            <div className="py-2 flex justify-around">
              <Button
                color="success"
                aria-label="Rematch"
                radius="none"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  onNewGame();
                  setGameOver(false);
                }}
              >
                <BsArrowRepeat size={24} />
                Rematch
              </Button>
              <Button
                color="success"
                variant="ghost"
                aria-label="New"
                radius="none"
                size="lg"
                onClick={() => router.push("/")}
              >
                <MdAdd size={24} />
                New Game
              </Button>
            </div>
          )}
          <div className="flex px-1 gap-2">
            <Button
              isIconOnly
              variant="light"
              aria-label="Share"
              onClick={handleLikeButtonClick}
            >
              <MdOutlineShare size={24} />
            </Button>
            <Button
              isIconOnly
              variant="light"
              aria-label="Settings"
              onClick={(e) => {
                e.preventDefault();
                onOpen();
              }}
            >
              <MdOutlineSettings size={24} />
            </Button>
            <Button
              variant="light"
              aria-label="Resign"
              className="ml-auto"
              onClick={(e) => {
                e.preventDefault();
                setShowGameModal(true);
                setGameOver(true);
              }}
            >
              <MdOutlinedFlag size={24} />
              Resign
            </Button>
          </div>
        </div>
      </div>
      <SettingsModal isOpen={isOpen} onClose={onClose} />
      <GameModal
        isOpen={showGameModal}
        onClose={() => setShowGameModal(false)}
        gameResult={gameResult}
        onNewGame={() => {
          onNewGame();
          setGameOver(false);
        }}
      />
    </>
  );
};

export default SideBoardComponent;
