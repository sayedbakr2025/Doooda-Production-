import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertTriangle, TrendingUp, AlertCircle, CheckCircle, X, Play, Download, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import DooodaCriticGraph from './DooodaCriticGraph';
import Button from '../Button';
import { getProjectTypeConfig } from '../../utils/projectTypeConfig';
import { supabase } from '../../lib/supabaseClient';
import type { ProjectType } from '../../types';

interface AcademicReport {
  title: string;
  abstract: string;
  introduction: string;
  methodology: string;
  structural_analysis: string;
  tension_analysis: string;
  pacing_analysis: string;
  causality_analysis: string;
  character_dynamics_analysis: string;
  thematic_cohesion_analysis: string;
  dramatic_arc_evaluation: string;
  act_structure_evaluation: string;
  midpoint_evaluation: string;
  climax_evaluation: string;
  structural_imbalances: string[];
  redundancy_and_filler_analysis: string;
  unused_setups_analysis: string;
  scene_level_diagnostics: Array<{
    chapter_index: number;
    scene_index: number;
    diagnosis: string;
    structural_function: string;
    strength: string;
    weakness: string;
    recommended_revision: string;
  }>;
  global_strengths: string[];
  global_weaknesses: string[];
  revision_strategy: string;
  final_evaluation: string;
  quality_score: number;
}

interface AnalysisData {
  overall_quality: number;
  academic_report?: AcademicReport;
  structure_analysis: string;
  tension_analysis: string;
  pacing_analysis: string;
  climax_analysis: string;
  chapter_scores: Array<{
    chapter_index: number;
    structure_score: number;
    tension_score: number;
    pacing_score: number;
    build_up_score: number;
    causality_score: number;
    recommendation: string;
  }>;
  scene_scores: Array<{
    chapter_index: number;
    scene_index: number;
    writer_tension?: number;
    ai_tension: number;
    writer_pace?: number;
    ai_pace: number;
    causality_score: number;
    dramatic_progress_score: number;
    filler_ratio: number;
    build_up_score: number;
    has_climax?: boolean;
    scene_purpose?: 'conflict' | 'setup' | 'payoff' | 'transition';
    recommendation: string;
  }>;
  global_structure?: {
    detected_midpoint_scene_index?: number;
    detected_main_climax_scene_index?: number;
    act_breakpoints?: {
      act1_end: number;
      act2_mid: number;
      act2_end: number;
    };
  };
  filler_scenes?: Array<{
    chapter_index: number;
    scene_index: number;
    reason: string;
  }>;
  unresolved_elements?: Array<{
    description: string;
    introduced_in: string;
    status: string;
  }>;
  structural_warnings?: string[];
  strengths?: string[];
  key_issues?: string[];
  recommendations?: string[];
}

interface PlotChapter {
  id: string;
  order_index: number;
  title: string;
}

interface PlotScene {
  id: string;
  chapter_id: string;
  order_index: number;
  title: string;
  ai_tension?: number | null;
  ai_pace?: number | null;
  accuracy_score?: number | null;
  causality_score?: number | null;
  dramatic_progress_score?: number | null;
  filler_ratio?: number | null;
  build_up_score?: number | null;
  scene_purpose?: string | null;
  ai_comment?: string | null;
}

interface PlotAnalysisViewProps {
  analysis: AnalysisData;
  isOutdated: boolean;
  language: 'ar' | 'en';
  executed: boolean;
  chapters: PlotChapter[];
  scenes: Map<string, PlotScene[]>;
  plotProjectId: string;
  onClose: () => void;
  onExecute: () => void;
  onAnalysisUpdated?: (updatedAnalysis: AnalysisData) => void;
  projectType?: ProjectType;
}

const PlotAnalysisView: React.FC<PlotAnalysisViewProps> = ({
  analysis,
  isOutdated,
  language,
  executed,
  chapters,
  scenes,
  plotProjectId,
  onClose,
  onExecute,
  onAnalysisUpdated,
  projectType,
}) => {
  const typeConfig = getProjectTypeConfig(projectType ?? 'novel');
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'report' | 'charts' | 'overview' | 'details'>('report');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExpandingReport, setIsExpandingReport] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleDownloadPDF = () => {
    if (!academicReport) return;

    if (!academicReport.introduction) {
      alert(language === 'ar'
        ? 'يجب توليد التقرير الأكاديمي أولاً. اضغط على "التقرير الأكاديمي" للمتابعة.'
        : 'You must generate the academic report first. Click "Academic Report" to proceed.');
      return;
    }

    setIsGeneratingPDF(true);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(language === 'ar'
        ? 'يرجى السماح بالنوافذ المنبثقة لتحميل التقرير'
        : 'Please allow pop-ups to download the report');
      setIsGeneratingPDF(false);
      return;
    }

    const isRTL = language === 'ar';
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${academicReport.title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: ${isRTL ? 'Arial, "Segoe UI", sans-serif' : '"Times New Roman", Georgia, serif'};
            line-height: 1.6;
            color: #333;
            padding: 40px;
            max-width: 210mm;
            margin: 0 auto;
            background: white;
          }

          h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 30px;
            text-align: center;
            color: #1a202c;
            border-bottom: 3px solid #3182ce;
            padding-bottom: 15px;
          }

          h2 {
            font-size: 16pt;
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 12px;
            color: #2d3748;
            border-${isRTL ? 'right' : 'left'}: 4px solid #3182ce;
            padding-${isRTL ? 'right' : 'left'}: 12px;
          }

          h3 {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 10px;
            color: #4a5568;
          }

          p {
            margin-bottom: 12px;
            text-align: justify;
            font-size: 11pt;
          }

          .abstract {
            background: #f7fafc;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 25px;
          }

          .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }

          ul {
            margin-${isRTL ? 'right' : 'left'}: 25px;
            margin-bottom: 12px;
          }

          li {
            margin-bottom: 6px;
            font-size: 11pt;
          }

          .strengths {
            background: #f0fdf4;
            border: 1px solid #86efac;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
          }

          .weaknesses {
            background: #fef2f2;
            border: 1px solid #fca5a5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
          }

          .imbalances {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
          }

          .quality-score {
            text-align: center;
            font-size: 18pt;
            font-weight: bold;
            color: #3182ce;
            margin: 20px 0;
            padding: 15px;
            background: #ebf8ff;
            border-radius: 8px;
          }

          .doooda-brand-footer {
            margin-top: 40px;
            padding: 16px 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 9pt;
            color: #a0aec0;
            font-style: italic;
            letter-spacing: 0.02em;
          }

          @media print {
            body {
              padding: 20px;
            }

            .no-print {
              display: none;
            }

            h2, h3 {
              page-break-after: avoid;
            }

            .section {
              page-break-inside: avoid;
            }

            @page {
              margin: 20mm 15mm;
              @bottom-center {
                content: "doooda";
                font-size: 8pt;
                color: #aaa;
                font-style: italic;
              }
            }
          }
        </style>
      </head>
      <body>
        <h1>${academicReport.title}</h1>

        <div class="quality-score">
          ${language === 'ar' ? 'درجة الجودة:' : 'Quality Score:'} ${(academicReport.quality_score * 100).toFixed(0)}%
        </div>

        <div class="section abstract">
          <h2>${language === 'ar' ? 'الملخص' : 'Abstract'}</h2>
          <p>${academicReport.abstract}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'المقدمة' : 'Introduction'}</h2>
          <p>${academicReport.introduction.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'المنهجية' : 'Methodology'}</h2>
          <p>${academicReport.methodology.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'التحليل البنيوي' : 'Structural Analysis'}</h2>
          <p>${academicReport.structural_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تحليل التوتر' : 'Tension Analysis'}</h2>
          <p>${academicReport.tension_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تحليل الإيقاع' : 'Pacing Analysis'}</h2>
          <p>${academicReport.pacing_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تحليل السببية' : 'Causality Analysis'}</h2>
          <p>${academicReport.causality_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'ديناميات الشخصيات' : 'Character Dynamics'}</h2>
          <p>${academicReport.character_dynamics_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'التماسك الموضوعي' : 'Thematic Cohesion'}</h2>
          <p>${academicReport.thematic_cohesion_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تقييم القوس الدرامي' : 'Dramatic Arc Evaluation'}</h2>
          <p>${academicReport.dramatic_arc_evaluation.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تقييم البنية ثلاثية الفصول' : 'Act Structure Evaluation'}</h2>
          <p>${academicReport.act_structure_evaluation.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تقييم نقطة المنتصف' : 'Midpoint Evaluation'}</h2>
          <p>${academicReport.midpoint_evaluation.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تقييم الذروة' : 'Climax Evaluation'}</h2>
          <p>${academicReport.climax_evaluation.replace(/\n/g, '</p><p>')}</p>
        </div>

        ${academicReport.structural_imbalances && academicReport.structural_imbalances.length > 0 ? `
        <div class="section imbalances">
          <h2>${language === 'ar' ? 'عدم التوازن البنيوي' : 'Structural Imbalances'}</h2>
          <ul>
            ${academicReport.structural_imbalances.map(imbalance => `<li>${imbalance}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="section">
          <h2>${language === 'ar' ? 'تحليل التكرار والحشو' : 'Redundancy and Filler Analysis'}</h2>
          <p>${academicReport.redundancy_and_filler_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'تحليل الإعدادات غير المستخدمة' : 'Unused Setups Analysis'}</h2>
          <p>${academicReport.unused_setups_analysis.replace(/\n/g, '</p><p>')}</p>
        </div>

        ${academicReport.global_strengths && academicReport.global_strengths.length > 0 ? `
        <div class="section strengths">
          <h2>${language === 'ar' ? 'نقاط القوة العالمية' : 'Global Strengths'}</h2>
          <ul>
            ${academicReport.global_strengths.map(strength => `<li>${strength}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${academicReport.global_weaknesses && academicReport.global_weaknesses.length > 0 ? `
        <div class="section weaknesses">
          <h2>${language === 'ar' ? 'نقاط الضعف العالمية' : 'Global Weaknesses'}</h2>
          <ul>
            ${academicReport.global_weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="section">
          <h2>${language === 'ar' ? 'استراتيجية المراجعة' : 'Revision Strategy'}</h2>
          <p>${academicReport.revision_strategy.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="section">
          <h2>${language === 'ar' ? 'التقييم النهائي' : 'Final Evaluation'}</h2>
          <p>${academicReport.final_evaluation.replace(/\n/g, '</p><p>')}</p>
        </div>

        <div class="doooda-brand-footer">
          ${language === 'ar' ? 'أُنشئ بواسطة دووودة' : 'Created with doooda'}
        </div>

        <div class="no-print" style="margin-top: 40px; padding: 20px; background: #f7fafc; border-radius: 8px; text-align: center;">
          <button onclick="window.print()" style="
            background: #3182ce;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            margin-${isRTL ? 'left' : 'right'}: 10px;
          ">
            ${language === 'ar' ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}
          </button>
          <button onclick="window.close()" style="
            background: #718096;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
          ">
            ${language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      setIsGeneratingPDF(false);
    }, 500);
  };

  const handleExpandReport = async () => {
    setIsExpandingReport(true);
    setExpandError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/expand-academic-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plot_project_id: plotProjectId, language }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to expand report');

      if (onAnalysisUpdated) {
        onAnalysisUpdated({ ...analysis, academic_report: data.academic_report });
      }
    } catch (err) {
      setExpandError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExpandingReport(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.75) return 'text-blue-600 dark:text-blue-400';
    if (score >= 0.45) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getQualityBg = (score: number) => {
    if (score >= 0.75) return 'bg-blue-100 dark:bg-blue-900';
    if (score >= 0.45) return 'bg-yellow-100 dark:bg-yellow-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  const getQualityLabel = (score: number) => {
    if (language === 'ar') {
      if (score >= 0.75) return 'جيد إلى ممتاز';
      if (score >= 0.45) return 'متوسط';
      return 'ضعيف';
    } else {
      if (score >= 0.75) return 'Good to Excellent';
      if (score >= 0.45) return 'Average';
      return 'Weak';
    }
  };

  const academicReport = analysis.academic_report;

  const renderExpandableSection = (
    title: string,
    content: string,
    sectionKey: string
  ) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <div className={`border rounded-lg overflow-hidden ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
            theme === 'dark' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <h3 className={`text-base font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {title}
          </h3>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
        {isExpanded && (
          <div className={`px-4 py-3 ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            <p className={`whitespace-pre-wrap leading-relaxed text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {content}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div
        className={`w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-lg shadow-2xl ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className={`sticky top-0 z-10 px-4 py-3 border-b ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {language === 'ar' ? 'تحليل دووودة الناقد' : 'Doooda Critic Analysis'}
              </h2>
              {isOutdated && (
                <div className="flex items-center gap-2 mt-1 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {language === 'ar'
                      ? 'التحليل قديم - يرجى التحديث'
                      : 'Analysis is outdated - please refresh'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-2">
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg ${getQualityBg(analysis.overall_quality)}`}>
                <div className={`text-2xl font-bold ${getQualityColor(analysis.overall_quality)}`}>
                  {(analysis.overall_quality * 100).toFixed(0)}%
                </div>
                <div className={`text-xs ${getQualityColor(analysis.overall_quality)}`}>
                  {getQualityLabel(analysis.overall_quality)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {(['report', 'charts', 'overview', 'details'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {language === 'ar'
                  ? tab === 'report' ? 'التقرير الأكاديمي'
                    : tab === 'charts' ? 'الرسوم البيانية'
                    : tab === 'overview' ? 'نظرة عامة'
                    : 'التفاصيل'
                  : tab === 'report' ? 'Academic Report'
                    : tab === 'charts' ? 'Charts'
                    : tab === 'overview' ? 'Overview'
                    : 'Details'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 pb-20">
          {activeTab === 'report' && academicReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {academicReport.title}
                </h2>
                <div className="flex items-center gap-2">
                  {!academicReport.introduction && (
                    <button
                      onClick={handleExpandReport}
                      disabled={isExpandingReport}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                        isExpandingReport ? 'opacity-60 cursor-not-allowed' : ''
                      } ${
                        theme === 'dark'
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                      title={language === 'ar' ? 'توليد التقرير الأكاديمي الكامل' : 'Generate full academic report'}
                    >
                      {isExpandingReport
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Sparkles className="w-4 h-4" />}
                      {isExpandingReport
                        ? (language === 'ar' ? 'جاري التوليد...' : 'Generating...')
                        : (language === 'ar' ? 'التقرير الأكاديمي' : 'Academic Report')}
                    </button>
                  )}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    title={language === 'ar' ? 'تحميل التقرير كملف PDF' : 'Download report as PDF'}
                  >
                    <Download className="w-4 h-4" />
                    {isGeneratingPDF
                      ? (language === 'ar' ? 'جاري التحضير...' : 'Preparing...')
                      : (language === 'ar' ? 'تحميل PDF' : 'Download PDF')}
                  </button>
                </div>
              </div>

              {!academicReport.introduction && !isExpandingReport && (
                <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-amber-900 bg-opacity-20 border-amber-700 text-amber-300'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {language === 'ar'
                      ? 'إذا كنت تريد تقريراً أكاديمياً، اضغط على "التقرير الأكاديمي"'
                      : 'If you want an academic report, click "Academic Report"'}
                  </p>
                </div>
              )}

              {expandError && (
                <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-red-900 bg-opacity-20 border-red-700 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{expandError}</p>
                </div>
              )}

              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                <h3 className={`text-base font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {language === 'ar' ? 'الملخص' : 'Abstract'}
                </h3>
                <p className={`leading-relaxed text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {academicReport.abstract}
                </p>
              </div>

              {renderExpandableSection(
                language === 'ar' ? 'المقدمة' : 'Introduction',
                academicReport.introduction,
                'introduction'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'المنهجية' : 'Methodology',
                academicReport.methodology,
                'methodology'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'التحليل البنيوي' : 'Structural Analysis',
                academicReport.structural_analysis,
                'structural_analysis'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تحليل التوتر' : 'Tension Analysis',
                academicReport.tension_analysis,
                'tension_analysis'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تحليل الإيقاع' : 'Pacing Analysis',
                academicReport.pacing_analysis,
                'pacing_analysis'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تحليل السببية' : 'Causality Analysis',
                academicReport.causality_analysis,
                'causality_analysis'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'ديناميات الشخصيات' : 'Character Dynamics',
                academicReport.character_dynamics_analysis,
                'character_dynamics'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'التماسك الموضوعي' : 'Thematic Cohesion',
                academicReport.thematic_cohesion_analysis,
                'thematic_cohesion'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تقييم القوس الدرامي' : 'Dramatic Arc Evaluation',
                academicReport.dramatic_arc_evaluation,
                'dramatic_arc'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تقييم البنية ثلاثية الفصول' : 'Act Structure Evaluation',
                academicReport.act_structure_evaluation,
                'act_structure'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تقييم نقطة المنتصف' : 'Midpoint Evaluation',
                academicReport.midpoint_evaluation,
                'midpoint'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تقييم الذروة' : 'Climax Evaluation',
                academicReport.climax_evaluation,
                'climax'
              )}

              {academicReport.structural_imbalances && academicReport.structural_imbalances.length > 0 && (
                <div className={`p-4 rounded-lg border-l-4 border-orange-500 ${
                  theme === 'dark' ? 'bg-orange-900 bg-opacity-20' : 'bg-orange-50'
                }`}>
                  <h3 className={`text-base font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {language === 'ar' ? 'عدم التوازن البنيوي' : 'Structural Imbalances'}
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {academicReport.structural_imbalances.map((imbalance, idx) => (
                      <li key={idx} className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {imbalance}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تحليل التكرار والحشو' : 'Redundancy and Filler Analysis',
                academicReport.redundancy_and_filler_analysis,
                'redundancy'
              )}

              {renderExpandableSection(
                language === 'ar' ? 'تحليل الإعدادات غير المستخدمة' : 'Unused Setups Analysis',
                academicReport.unused_setups_analysis,
                'unused_setups'
              )}

              {academicReport.global_strengths && academicReport.global_strengths.length > 0 && (
                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-green-900 bg-opacity-20' : 'bg-green-50'
                }`}>
                  <h3 className={`text-base font-bold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {language === 'ar' ? 'نقاط القوة العالمية' : 'Global Strengths'}
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {academicReport.global_strengths.map((strength, idx) => (
                      <li key={idx} className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {academicReport.global_weaknesses && academicReport.global_weaknesses.length > 0 && (
                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
                }`}>
                  <h3 className={`text-base font-bold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    {language === 'ar' ? 'نقاط الضعف العالمية' : 'Global Weaknesses'}
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {academicReport.global_weaknesses.map((weakness, idx) => (
                      <li key={idx} className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {renderExpandableSection(
                language === 'ar' ? 'استراتيجية المراجعة' : 'Revision Strategy',
                academicReport.revision_strategy,
                'revision_strategy'
              )}

              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-50'
              }`}>
                <h3 className={`text-base font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {language === 'ar' ? 'التقييم النهائي' : 'Final Evaluation'}
                </h3>
                <p className={`leading-relaxed text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {academicReport.final_evaluation}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'report' && !academicReport && (
            <div className={`p-6 text-center ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {language === 'ar'
                ? 'التقرير الأكاديمي غير متوفر في هذا التحليل'
                : 'Academic report not available in this analysis'}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div>
                  <h3 className={`text-base font-semibold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {language === 'ar' ? 'نقاط القوة' : 'Strengths'}
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.strengths.map((strength, index) => (
                      <li
                        key={index}
                        className={`p-2.5 rounded-lg ${
                          theme === 'dark' ? 'bg-green-900 bg-opacity-20' : 'bg-green-50'
                        }`}
                      >
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {strength}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.key_issues && analysis.key_issues.length > 0 && (
                <div>
                  <h3 className={`text-base font-semibold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    {language === 'ar' ? 'المشاكل الرئيسية' : 'Key Issues'}
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.key_issues.map((issue, index) => (
                      <li
                        key={index}
                        className={`p-2.5 rounded-lg ${
                          theme === 'dark' ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
                        }`}
                      >
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {issue}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div>
                  <h3 className={`text-base font-semibold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className={`p-2.5 rounded-lg ${
                          theme === 'dark' ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-50'
                        }`}
                      >
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {rec}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-4">
              <DooodaCriticGraph
                analysis={analysis}
                chapters={chapters}
                scenes={scenes}
                language={language}
                projectType={projectType}
              />

              {analysis.filler_scenes && analysis.filler_scenes.length > 0 && (
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
                }`}>
                  <h3 className={`text-base font-semibold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    {language === 'ar' ? 'مشاهد حشوية' : 'Filler Scenes'}
                  </h3>
                  <ul className="space-y-1">
                    {analysis.filler_scenes.map((filler, index) => (
                      <li key={index} className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <span className="font-semibold">
                          {language === 'ar'
                            ? `${typeConfig.containerLabelAr} ${filler.chapter_index} - ${typeConfig.unitLabelAr} ${filler.scene_index}: `
                            : `${typeConfig.containerLabelEn} ${filler.chapter_index} - ${typeConfig.unitLabelEn} ${filler.scene_index}: `}
                        </span>
                        {filler.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.unresolved_elements && analysis.unresolved_elements.length > 0 && (
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50'
                }`}>
                  <h3 className={`text-base font-semibold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    {language === 'ar' ? 'عناصر غير محلولة' : 'Unresolved Elements'}
                  </h3>
                  <ul className="space-y-1">
                    {analysis.unresolved_elements.map((element, index) => (
                      <li key={index} className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div className="font-semibold">{element.description}</div>
                        <div className="text-xs mt-0.5">
                          {language === 'ar' ? 'تم تقديمه في: ' : 'Introduced in: '}
                          {element.introduced_in} - {element.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.structural_warnings && analysis.structural_warnings.length > 0 && (
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-orange-900 bg-opacity-20' : 'bg-orange-50'
                }`}>
                  <h3 className={`text-base font-semibold mb-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    {language === 'ar' ? 'تحذيرات بنيوية' : 'Structural Warnings'}
                  </h3>
                  <ul className="space-y-1">
                    {analysis.structural_warnings.map((warning, index) => (
                      <li key={index} className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <h3 className={`text-base font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {language === 'ar' ? 'تحليل البنية' : 'Structure Analysis'}
                </h3>
                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {analysis.structure_analysis}
                </p>
              </div>

              <div>
                <h3 className={`text-base font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {language === 'ar' ? 'تحليل التوتر' : 'Tension Analysis'}
                </h3>
                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {analysis.tension_analysis}
                </p>
              </div>

              <div>
                <h3 className={`text-base font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {language === 'ar' ? 'تحليل الإيقاع' : 'Pacing Analysis'}
                </h3>
                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {analysis.pacing_analysis}
                </p>
              </div>

              <div>
                <h3 className={`text-base font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {language === 'ar' ? 'تحليل الذروات' : 'Climax Analysis'}
                </h3>
                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {analysis.climax_analysis}
                </p>
              </div>
            </div>
          )}
        </div>

        {!executed && (
          <div className={`fixed bottom-0 left-0 right-0 p-3 border-t ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <Button
              onClick={onExecute}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-base"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              <Play className="w-5 h-5" />
              {language === 'ar' ? 'تنفيذ مخطط الحبكة' : 'Execute Plot Structure'}
            </Button>
          </div>
        )}

        {executed && (
          <div className={`fixed bottom-0 left-0 right-0 p-3 border-t ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-center py-1">
              <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                {language === 'ar' ? 'تم تنفيذ المخطط مسبقاً' : 'Plot Already Executed'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlotAnalysisView;
