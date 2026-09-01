import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Check, Clipboard, CloudUpload, Download, FileCheck2, Image as ImageIcon, Loader2, RefreshCw, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

type ExtractedData = Record<string, string | null> & { userIMG: string | null; signIMG: string | null };

const fields: Array<[keyof ExtractedData, string]> = [
  ["nameBangla", "নাম (বাংলা)"], ["nameEnglish", "Name (English)"], ["nationalId", "জাতীয় পরিচয়পত্র নম্বর"],
  ["pin", "PIN"], ["dateOfBirth", "জন্ম তারিখ"], ["fatherName", "পিতার নাম"], ["motherName", "মাতার নাম"],
  ["spouseName", "স্বামী/স্ত্রীর নাম"], ["gender", "লিঙ্গ"], ["religion", "ধর্ম"], ["bloodGroup", "রক্তের গ্রুপ"],
  ["birthPlace", "জন্মস্থান"], ["address", "ঠিকানা"],
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState("");
  const extract = trpc.pdf.extract.useMutation({
    onSuccess: (response) => { setData(response.data as ExtractedData); setError(""); toast.success("তথ্য সফলভাবে পাওয়া গেছে"); },
    onError: (failure) => { setError(failure.message || "PDF প্রক্রিয়াকরণ করা যায়নি।"); setData(null); },
  });
  const responseText = useMemo(() => data ? JSON.stringify(data, null, 2) : "", [data]);

  function chooseFile(next: File | undefined) {
    setError(""); setData(null);
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setError("শুধু PDF ফাইল আপলোড করা যাবে।"); return; }
    if (next.size > MAX_FILE_BYTES) { setError("ফাইলের আকার ১০ MB-এর মধ্যে হতে হবে।"); return; }
    setFile(next);
  }

  async function submit() {
    if (!file) return;
    setError("");
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("ফাইল পড়া যায়নি।")); reader.readAsDataURL(file); });
    extract.mutate({ fileName: file.name, mimeType: "application/pdf", contentBase64: base64 });
  }

  function clear() { setFile(null); setData(null); setError(""); if (inputRef.current) inputRef.current.value = ""; }
  async function copyResponse() { await navigator.clipboard.writeText(responseText); toast.success("Response কপি হয়েছে"); }
  function downloadResponse() { const blob = new Blob([responseText], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file?.name.replace(/\.pdf$/i, "") || "nid-response"}.json`; anchor.click(); URL.revokeObjectURL(url); }

  return <main className="min-h-screen overflow-hidden bg-[#f7f8fc] text-[#14213d]">
    <div className="hero-glow" />
    <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
      <div className="flex items-center gap-3"><div className="brand-mark"><FileCheck2 size={19} /></div><span className="text-sm font-semibold tracking-[0.18em] text-[#31527f] uppercase">NID Extract</span></div>
      <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex"><ShieldCheck size={15} className="text-[#3b806c]" /> Secure, temporary processing</div>
    </nav>
    <section className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8 lg:pt-16">
      <div className="max-w-xl"><Badge className="mb-5 rounded-full border border-[#d9e5f3] bg-white px-3 py-1 text-[#50719b] shadow-sm">Bangla NID PDF utility</Badge><h1 className="mb-5 text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#14213d] sm:text-6xl">Your document,<br /><span className="text-[#397c6d]">made readable.</span></h1><p className="max-w-md text-base leading-7 text-slate-600 sm:text-lg">Upload a Bangla NID PDF and receive clean, structured fields with the portrait and signature preserved exactly as intended.</p><div className="mt-8 flex flex-wrap gap-5 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[#397c6d]" /> 10 MB limit</span><span className="inline-flex items-center gap-2"><Check size={16} className="text-[#397c6d]" /> Bengali OCR fallback</span></div></div>
      <Card className="glass-card overflow-hidden rounded-[28px] border-0 shadow-[0_24px_70px_rgba(27,54,88,0.12)]"><CardHeader className="border-b border-slate-100 px-6 pb-5 pt-6 sm:px-8"><div className="flex items-start justify-between"><div><CardTitle className="text-xl text-[#14213d]">Extract NID details</CardTitle><p className="mt-1 text-sm text-slate-500">PDF only · processed securely on the server</p></div><div className="rounded-2xl bg-[#e8f3f0] p-3 text-[#397c6d]"><CloudUpload size={22} /></div></div></CardHeader><CardContent className="px-6 py-6 sm:px-8">
        {!file && !extract.isPending && <button type="button" onClick={() => inputRef.current?.click()} className="upload-zone group w-full rounded-2xl border-2 border-dashed border-[#cbdbea] bg-[#fbfcfe] px-6 py-12 text-center transition hover:border-[#70a99a] hover:bg-[#f5fbf9]"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f3f0] text-[#397c6d] transition group-hover:scale-105"><CloudUpload size={25} /></div><p className="font-semibold text-[#243c60]">Choose a Bangla NID PDF</p><p className="mt-2 text-sm text-slate-500">or drag and drop your file here</p><span className="mt-5 inline-flex rounded-lg bg-[#14213d] px-4 py-2 text-xs font-semibold text-white">Browse files</span></button>}
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
        {file && !extract.isPending && !data && <div className="rounded-2xl border border-[#dce7ef] bg-[#fbfcfe] p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#e8f3f0] p-3 text-[#397c6d]"><FileCheck2 size={20} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#243c60]">{file.name}</p><p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · ready to process</p></div><button onClick={clear} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Remove file"><X size={17} /></button></div><Button onClick={submit} className="mt-5 h-11 w-full rounded-xl bg-[#397c6d] font-semibold text-white hover:bg-[#2f6b5d]">Extract information <CloudUpload size={17} /></Button></div>}
        {extract.isPending && <div className="rounded-2xl bg-[#f3f7fb] px-6 py-10 text-center"><Loader2 className="mx-auto animate-spin text-[#397c6d]" size={29} /><p className="mt-4 font-semibold text-[#243c60]">Reading your document…</p><p className="mt-1 text-sm text-slate-500">Extracting text, portrait and signature</p><Progress value={62} className="mx-auto mt-6 max-w-xs" /></div>}
        {error && <Alert variant="destructive" className="mt-4 rounded-2xl"><TriangleAlert size={17} /><AlertTitle>Could not process this file</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {data && <div className="mt-1"><div className="mb-5 flex items-center justify-between rounded-2xl bg-[#edf8f3] px-4 py-3 text-sm text-[#2c6c5b]"><span className="flex items-center gap-2 font-semibold"><Check size={17} /> Extraction complete</span><button onClick={clear} className="flex items-center gap-1 text-xs font-semibold hover:underline"><RefreshCw size={14} /> New file</button></div><div className="grid gap-4 sm:grid-cols-[130px_1fr]"><div className="space-y-3"><div className="image-frame">{data.userIMG ? <img src={data.userIMG} alt="NID portrait" /> : <div className="missing-media"><ImageIcon size={18} /><span>Portrait unavailable</span></div>}</div><div className="signature-frame">{data.signIMG ? <img src={data.signIMG} alt="NID signature" /> : <div className="missing-media"><ImageIcon size={18} /><span>Signature unavailable</span></div>}</div></div><div className="field-grid">{fields.map(([key, label]) => data[key] ? <div key={key} className="field-card"><p>{label}</p><strong>{data[key]}</strong></div> : null)}</div></div><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={copyResponse} className="rounded-xl border-slate-200 bg-white"><Clipboard size={16} /> Copy response</Button><Button variant="outline" onClick={downloadResponse} className="rounded-xl border-slate-200 bg-white"><Download size={16} /> Download JSON</Button></div></div>}
      </CardContent></Card>
    </section>
    <footer className="relative z-10 mx-auto flex max-w-6xl flex-col gap-2 border-t border-slate-200/70 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>Built for clear, careful document processing.</span><span>Files are processed in temporary runtime storage and removed after extraction.</span></footer>
  </main>;
}
