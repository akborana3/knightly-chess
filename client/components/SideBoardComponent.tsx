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
import { Tabs, Tab, Button, useDisclosure } from "@nextui-org/react";
import { GameModal, SettingsModal } from ".";
import toast from "react-hot-toast";
import axios from "axios";

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
  const [allMoves, setAllMoves] = useState<string[]>([]);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const moves = useBoardStore((state) => state.moves);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showGameModal, setShowGameModal] = useState(false);
  const gameOver = useBoardStore((state) => state.gameOver);
  const setGameOver = useBoardStore((state) => state.setGameOver);
  const onNewGame = useBoardStore((state) => state.onNewGame);
  const gameResult = useBoardStore((state) => state.gameResult);
  const currentFEN = useBoardStore((state) => state.currentFEN);
  const router = useRouter();

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
    // Combine previous moves and the current message for the prompt
    const newMoves = [...allMoves, message];
    const userPrompt = newMoves.join(" "); // This ensures all moves are sent, including the current one

    // Send the message to the chat display
    onSendMessage(message);

    // Update the state with the latest move
    setAllMoves(newMoves);
    setMessage(""); // Clear the input field

    // Prepare the data payload for the API request
    const data = {
      userPrompt: userPrompt
    };

    try {
      const response = await axios.post(
        "https://akmoviedl.vercel.app/api/chessgpt",
        data,
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 20000
        }
      );

      // Log full response data to help debug any formatting issues
      console.log('Full API Response Data:', response.data);

      if (response && response.data) {
        // Try to access the AI response, checking different response structures
        const aiResponse = response.data.message || response.data.response || response.data;

        console.log('Parsed AI Response:', aiResponse);

        if (typeof aiResponse === 'string') {
          onSendMessage(aiResponse);
        } else {
          console.error("Unexpected AI response format. Expected a string but received:", aiResponse);
          onSendMessage("Error: AI response format was not as expected.");
        }
      } else {
        console.error("Empty or invalid response format:", response.data);
        onSendMessage("Error: AI response format was not as expected.");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios Error Details:", error.toJSON());
        if (error.code === "ECONNABORTED") {
          console.error("Request Timeout:", error.message);
          onSendMessage("Error: Request timed out.");
        } else if (!error.response) {
          console.error("Network Error:", error.message);
          onSendMessage("Error: Network error, please check your connection.");
        } else {
          console.error("API Response Error:", error.response.status, error.response.data);
          onSendMessage(`Error: ${error.response.data?.message || "Invalid request"}`);
        }
      } else {
        console.error("General Error:", error);
        onSendMessage("Error: Could not retrieve response from AI.");
      }
    }
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
            <div className="flex-1 overflow-y-auto max-h-[480px] px-4 py-1">
              <div className="flex flex-col-reverse space-y-1">
                {messages
                  .slice()
                  .reverse()
                  .map((msg, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-yellow-400">{msg.username}:</span>
                      <span className="px-1">{msg.content}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="mt-auto relative" ref={emojiPickerRef}>
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-4 py-2 bg-slate-900 text-white border-t-[1px] border-gray-600 focus:outline-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyUp={handleKeyPress}
              />
              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={"dark" as Theme}
                  />
                </div>
              )}
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
                        
