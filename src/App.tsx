import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Wand2, Loader2, Download, RefreshCw, History, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Slider } from '@/src/components/ui/slider';
import { generateBlendedImage } from '@/src/services/geminiService';

interface HistoryItem {
  id: string;
  productImage: string;
  referenceImage: string;
  resultImage: string;
  prompt: string;
  blendStrength: number;
  timestamp: number;
}

export default function App() {
  const [productImage, setProductImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [referenceImage, setReferenceImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [prompt, setPrompt] = useState('Adapt the style, lighting, and composition of the second reference image to the first product image. Ensure subtle variations to avoid direct copying.');
  const [blendStrength, setBlendStrength] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const productInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('styleblend-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (item: HistoryItem) => {
    const newHistory = [item, ...history].slice(0, 10); // Keep last 10
    setHistory(newHistory);
    localStorage.setItem('styleblend-history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('styleblend-history');
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<{ url: string; base64: string; mimeType: string } | null>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const matches = result.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        setImage({
          url: result,
          mimeType: matches[1],
          base64: matches[2],
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!productImage || !referenceImage) {
      setError('Please upload both a product image and a reference image.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateBlendedImage(
        productImage.base64,
        productImage.mimeType,
        referenceImage.base64,
        referenceImage.mimeType,
        prompt,
        blendStrength
      );
      setResultImage(result);
      
      saveToHistory({
        id: Date.now().toString(),
        productImage: productImage.url,
        referenceImage: referenceImage.url,
        resultImage: result,
        prompt,
        blendStrength,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl: string = resultImage!) => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `styleblend-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResultImage(item.resultImage);
    setPrompt(item.prompt);
    setBlendStrength(item.blendStrength || 50);
    // We can't easily recreate the base64/mimeType objects without parsing the data URLs again,
    // but for display purposes we could just set the URLs. 
    // For simplicity, we just show the result and prompt.
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">StyleBlend AI</h1>
            <p className="text-zinc-500 mt-1">Smart Product Visual Adaptor</p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Product Image</CardTitle>
                <CardDescription>Upload the base image of your product.</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-zinc-200 rounded-lg p-4 text-center hover:bg-zinc-50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
                  onClick={() => productInputRef.current?.click()}
                >
                  {productImage ? (
                    <img src={productImage.url} alt="Product" className="max-h-[200px] object-contain rounded-md" />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-500">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Click to upload product</span>
                      <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={productInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setProductImage)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Reference Style</CardTitle>
                <CardDescription>Upload an image with the desired lighting, mood, or composition.</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-zinc-200 rounded-lg p-4 text-center hover:bg-zinc-50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
                  onClick={() => referenceInputRef.current?.click()}
                >
                  {referenceImage ? (
                    <img src={referenceImage.url} alt="Reference" className="max-h-[200px] object-contain rounded-md" />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-500">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Click to upload reference</span>
                      <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={referenceInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setReferenceImage)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Generation Settings</CardTitle>
                <CardDescription>Guide the AI on how to blend the images.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="strength">Blend Strength: {blendStrength}%</Label>
                  </div>
                  <Slider 
                    id="strength"
                    min={0} 
                    max={100} 
                    step={1} 
                    value={[blendStrength]} 
                    onValueChange={(val) => setBlendStrength(val[0])}
                  />
                  <p className="text-xs text-zinc-500">
                    {blendStrength < 30 ? "Subtle changes, keeps original product shape." : 
                     blendStrength > 70 ? "Heavy transformation, closely matches reference style." : 
                     "Balanced blend of product and reference style."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Custom Prompt (Optional)</Label>
                  <Input 
                    id="prompt" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how to blend the images..."
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full h-12 text-lg" 
              onClick={handleGenerate}
              disabled={!productImage || !referenceImage || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Blend Style
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Output & History */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Result</CardTitle>
                  <CardDescription>Your generated product visualization.</CardDescription>
                </div>
                {resultImage && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleGenerate()} disabled={isGenerating}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                    <Button size="sm" onClick={() => handleDownload(resultImage)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-col min-h-[500px]">
                <div className="flex-1 bg-zinc-100 rounded-lg border border-zinc-200 flex items-center justify-center overflow-hidden relative min-h-[500px]">
                  {isGenerating ? (
                    <div className="flex flex-col items-center text-zinc-500">
                      <Loader2 className="w-12 h-12 animate-spin mb-4 text-zinc-400" />
                      <p className="font-medium animate-pulse">Blending styles...</p>
                      <p className="text-sm mt-2 text-zinc-400">This may take a few seconds</p>
                    </div>
                  ) : resultImage ? (
                    <img 
                      src={resultImage} 
                      alt="Generated Result" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 p-8 text-center">
                      <Wand2 className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-zinc-500">No image generated yet</p>
                      <p className="text-sm mt-2 max-w-sm">
                        Upload your product and reference images, then click "Blend Style" to see the magic happen.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {history.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <History className="w-5 h-5 mr-2" />
                      Recent Generations
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="text-zinc-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {history.map((item) => (
                      <div 
                        key={item.id} 
                        className="group relative aspect-square rounded-md overflow-hidden border border-zinc-200 cursor-pointer hover:ring-2 hover:ring-zinc-900 transition-all"
                        onClick={() => loadHistoryItem(item)}
                      >
                        <img src={item.resultImage} alt="History item" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(item.resultImage); }}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

