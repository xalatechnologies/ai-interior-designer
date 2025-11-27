import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Sparkles, RefreshCcw, Camera } from 'lucide-react';
import { ComparisonSlider } from './components/ComparisonSlider';
import { ChatInterface } from './components/ChatInterface';
import { generateRoomDesign, chatWithDesigner } from './services/geminiService';
import { Message, Sender, DesignStyle, ComparisonState } from './types';

const App: React.FC = () => {
  const [comparisonState, setComparisonState] = useState<ComparisonState>({
    originalImage: null,
    generatedImage: null,
    isGenerating: false,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Image Handling ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComparisonState({
          originalImage: reader.result as string,
          generatedImage: null, // Reset generated on new upload
          isGenerating: false,
        });
        setMessages([]); // Reset chat
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // --- Actions ---

  const handleInitialGeneration = async (style: DesignStyle) => {
    if (!comparisonState.originalImage) return;

    setSelectedStyle(style);
    setComparisonState(prev => ({ ...prev, isGenerating: true }));

    const prompt = `Redesign this room in a ${style} interior design style. Keep the structural elements (windows, doors, walls) but modernize the furniture, decor, and lighting to match the ${style} aesthetic. High quality, photorealistic, 4k.`;

    try {
      const newImage = await generateRoomDesign(comparisonState.originalImage, prompt);
      
      setComparisonState(prev => ({
        ...prev,
        generatedImage: newImage,
        isGenerating: false,
      }));

      // Add initial bot message
      const initialMsg: Message = {
        id: Date.now().toString(),
        text: `Here is your space reimagined in ${style} style! You can use the slider to compare or chat with me to refine details.`,
        sender: Sender.Bot,
        timestamp: Date.now(),
      };
      setMessages([initialMsg]);

    } catch (error) {
      console.error(error);
      setComparisonState(prev => ({ ...prev, isGenerating: false }));
      alert("Failed to generate design. Please check your API key or try again.");
    }
  };

  const handleChatOrRefine = async (text: string, mode: 'chat' | 'refine') => {
    // Optimistic user update
    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      sender: Sender.User,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const activeImage = comparisonState.generatedImage || comparisonState.originalImage;

    try {
      if (mode === 'refine') {
        if (!activeImage) {
            throw new Error("No image to refine.");
        }
        // Image Editing Mode (Gemini 2.5 Flash Image)
        const refinedImage = await generateRoomDesign(activeImage, text);
        
        setComparisonState(prev => ({
          ...prev,
          generatedImage: refinedImage, // Update the 'After' image
          // Note: We keep originalImage as the 'Before' reference for the slider? 
          // Or do we update 'Original' to be the previous state?
          // For a "Compare" slider, it usually makes sense to compare against the *very first* upload
          // OR the *previous* iteration. Let's keep comparing against the Original Upload for this UI,
          // as otherwise the "Before" slider becomes moving target.
        }));

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `I've updated the design based on your request: "${text}".`,
          sender: Sender.Bot,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, botMsg]);

      } else {
        // Chat Mode (Gemini 3 Pro)
        const response = await chatWithDesigner(
            messages, 
            text, 
            activeImage || undefined
        );

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: response.text,
          sender: Sender.Bot,
          timestamp: Date.now(),
          groundingUrls: response.groundingUrls
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I encountered an error processing your request. Please try again.",
        sender: Sender.Bot,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden">
      
      {/* LEFT PANEL: VISUALIZATION */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Navbar / Header */}
        <header className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-start bg-gradient-to-b from-slate-950/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                 <Sparkles size={18} className="text-white" />
              </span>
              Lumina
            </h1>
          </div>
          <div className="pointer-events-auto">
             <button 
                onClick={triggerUpload}
                className="bg-slate-800/80 backdrop-blur hover:bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 border border-slate-700 shadow-lg"
             >
                <Upload size={16} />
                {comparisonState.originalImage ? 'New Upload' : 'Upload Photo'}
             </button>
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
             />
          </div>
        </header>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-slate-900 flex items-center justify-center relative">
          
          {comparisonState.isGenerating && (
            <div className="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center">
               <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-indigo-200 font-medium animate-pulse">Dreaming up your new space...</p>
            </div>
          )}

          {!comparisonState.originalImage ? (
            <div className="text-center p-10 max-w-md">
                <div 
                  onClick={triggerUpload}
                  className="w-full aspect-video border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group"
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                        <Camera size={32} className="text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Upload your room</h3>
                    <p className="text-slate-400 text-sm px-8">
                        Drag and drop or click to upload a photo of your space to start the transformation.
                    </p>
                </div>
            </div>
          ) : !comparisonState.generatedImage ? (
             /* Style Selection State */
             <div className="w-full h-full flex flex-col">
                <div className="flex-1 relative">
                    <img 
                        src={comparisonState.originalImage} 
                        className="w-full h-full object-cover opacity-50" 
                        alt="Original" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-slate-950 via-transparent to-transparent">
                        <div className="w-full max-w-4xl px-6 pb-12 pt-32 text-center">
                            <h2 className="text-3xl font-bold text-white mb-8 drop-shadow-lg">Choose a style to reimagine this space</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.values(DesignStyle).map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => handleInitialGeneration(style)}
                                        className="group relative overflow-hidden rounded-xl aspect-[4/3] bg-slate-800 border border-slate-700 hover:border-indigo-500 transition-all transform hover:-translate-y-1 hover:shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-slate-900 group-hover:bg-slate-800 transition-colors" />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                            {/* We could add style icons or small placeholder images here if we had them */}
                                            <span className="text-lg font-medium text-slate-200 group-hover:text-white relative z-10">{style}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          ) : (
             /* Comparison State */
             <div className="w-full h-full p-4 md:p-8 pt-24 pb-8 flex flex-col">
                <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                    <ComparisonSlider 
                        beforeImage={comparisonState.originalImage} 
                        afterImage={comparisonState.generatedImage} 
                        className="w-full h-full"
                    />
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 z-20">
                        <button 
                            onClick={() => comparisonState.originalImage && handleInitialGeneration(selectedStyle || DesignStyle.Modern)}
                            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors tooltip"
                            title="Regenerate"
                        >
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CHAT */}
      {/* Show chat only if we have an image uploaded, otherwise it distracts */}
      {comparisonState.originalImage && (
        <div className="w-full md:w-[400px] h-[40vh] md:h-screen flex-shrink-0 z-40 shadow-2xl">
            <ChatInterface 
                messages={messages} 
                onSendMessage={handleChatOrRefine}
                isTyping={isTyping}
            />
        </div>
      )}
    </div>
  );
};

export default App;
