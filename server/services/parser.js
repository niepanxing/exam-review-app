import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import JSZip from 'jszip'

/**
 * 解析PDF文件，返回按页分组的内容
 */
async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath)
  const pdfData = await pdfParse(dataBuffer)
  
  // pdf-parse 不直接提供按页分割，我们用换行和文本重组
  const fullText = pdfData.text
  const pages = []
  
  // 尝试按页分割：PDF中常见页分隔符
  const pageBreakRegex = /\f/
  const rawPages = fullText.split(pageBreakRegex)
  
  if (rawPages.length > 1) {
    rawPages.forEach((text, i) => {
      const trimmed = text.trim()
      if (trimmed) {
        pages.push({ page: i + 1, content: trimmed })
      }
    })
  } else {
    // 如果无法分页，按大约3000字符一段分割
    const chunkSize = 3000
    let page = 1
    for (let i = 0; i < fullText.length; i += chunkSize) {
      const chunk = fullText.slice(i, i + chunkSize).trim()
      if (chunk) {
        pages.push({ page, content: chunk })
        page++
      }
    }
  }
  
  return pages
}

/**
 * 解析Word文件，返回按段分组的内容
 */
async function parseWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath })
  const fullText = result.value
  
  // Word文档没有原生页码，按段落分组
  const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim())
  const pages = []
  const chunkSize = 8 // 每8段为一"页"
  
  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    const chunk = paragraphs.slice(i, i + chunkSize).join('\n\n').trim()
    if (chunk) {
      pages.push({ page: Math.floor(i / chunkSize) + 1, content: chunk })
    }
  }
  
  return pages
}

/**
 * 解析TXT文件
 */
async function parseTXT(filePath) {
  const fullText = fs.readFileSync(filePath, 'utf-8')
  const lines = fullText.split('\n').filter(l => l.trim())
  const pages = []
  const chunkSize = 50 // 每50行为一"页"
  
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n').trim()
    if (chunk) {
      pages.push({ page: Math.floor(i / chunkSize) + 1, content: chunk })
    }
  }
  
  return pages
}

/**
 * 解析PPT文件（.pptx），按幻灯片分页
 * pptx 本质是 zip 包，内部 XML 存幻灯片内容
 */
async function parsePPTX(filePath) {
  const dataBuffer = fs.readFileSync(filePath)
  const zip = await JSZip.loadAsync(dataBuffer)
  const pages = []
  
  // 获取所有 slide 文件并排序
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0')
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0')
      return numA - numB
    })
  
  for (const slideFile of slideFiles) {
    const xmlContent = await zip.files[slideFile].async('string')
    const slideNum = parseInt(slideFile.match(/slide(\d+)/)?.[1] || '0')
    
    // 从 XML 中提取文本：匹配 <a:t>...</a:t> 标签
    const textMatches = xmlContent.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || []
    const texts = textMatches
      .map(m => m.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
      .filter(t => t.length > 0)
    
    if (texts.length > 0) {
      pages.push({ page: slideNum, content: texts.join('\n') })
    }
  }
  
  if (pages.length === 0) {
    throw new Error('PPT文件中未找到文本内容，可能是纯图片/扫描版PPT')
  }
  
  return pages
}

/**
 * 解析Markdown文件
 */
async function parseMarkdown(filePath) {
  const fullText = fs.readFileSync(filePath, 'utf-8')
  
  // 按一级或二级标题分节，每节视为一"页"
  const sections = fullText.split(/^(#{1,2}\s+.+)$/m)
  const pages = []
  
  if (sections.length <= 1) {
    // 没有标题结构，按行数分块
    const lines = fullText.split('\n').filter(l => l.trim())
    const chunkSize = 50
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join('\n').trim()
      if (chunk) {
        pages.push({ page: Math.floor(i / chunkSize) + 1, content: chunk })
      }
    }
  } else {
    // 有标题，按标题分节
    let currentContent = ''
    let pageNum = 0
    
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i].trim()
      if (!s) continue
      
      if (/^#{1,2}\s+/.test(s)) {
        // 遇到新标题，保存上一节
        if (currentContent.trim()) {
          pageNum++
          pages.push({ page: pageNum, content: currentContent.trim() })
        }
        currentContent = s + '\n'
      } else {
        currentContent += s + '\n'
      }
    }
    // 最后一节
    if (currentContent.trim()) {
      pageNum++
      pages.push({ page: pageNum, content: currentContent.trim() })
    }
  }
  
  return pages
}

/**
 * 统一解析入口
 */
export async function parseDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  
  switch (ext) {
    case '.pdf':
      return await parsePDF(filePath)
    case '.docx':
    case '.doc':
      return await parseWord(filePath)
    case '.txt':
      return await parseTXT(filePath)
    case '.pptx':
      return await parsePPTX(filePath)
    case '.md':
    case '.markdown':
      return await parseMarkdown(filePath)
    default:
      throw new Error(`不支持的文件格式: ${ext}，仅支持 PDF/Word/TXT/PPT/Markdown`)
  }
}
