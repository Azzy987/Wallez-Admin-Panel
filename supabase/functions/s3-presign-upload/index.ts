import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a presigned read URL for testing
async function createPresignedReadUrl(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const algorithm = 'AWS4-HMAC-SHA256'
  const service = 's3'
  const host = `${bucket}.s3.${region}.amazonaws.com`
  const url = `https://${host}/${key}`
  
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  })
  
  const canonicalRequest = [
    'GET',
    `/${key}`,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n')
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n')
  
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = await hmacSha256(signingKey, stringToSign)
  
  queryParams.set('X-Amz-Signature', signature)
  
  return `${url}?${queryParams.toString()}`
}

// Check if file exists in S3
async function checkFileExists(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucket: string,
  key: string
): Promise<boolean> {
  const host = `${bucket}.s3.${region}.amazonaws.com`
  const url = `https://${host}/${key}`
  
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  
  const canonicalRequest = [
    'HEAD',
    `/${key}`,
    '',
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n')
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n')
  
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, 's3')
  const signature = await hmacSha256(signingKey, stringToSign)
  
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host, Signature=${signature}`
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Host': host,
        'Authorization': authHeader,
        'X-Amz-Date': amzDate,
      }
    })
    
    return response.status === 200
  } catch (e) {
    console.log('Error checking file existence:', e)
    return false
  }
}

// Manual presigned URL generation to avoid AWS SDK credential provider issues
async function createPresignedUrl(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 300
): Promise<string> {
  const algorithm = 'AWS4-HMAC-SHA256'
  const service = 's3'
  const host = `${bucket}.s3.${region}.amazonaws.com`
  const url = `https://${host}/${key}`
  
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  })
  
  const canonicalRequest = [
    'PUT',
    `/${key}`,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n')
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n')
  
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = await hmacSha256(signingKey, stringToSign)
  
  queryParams.set('X-Amz-Signature', signature)
  
  return `${url}?${queryParams.toString()}`
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256(key: Uint8Array, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  
  const kDate = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', encoder.encode(`AWS4${secretAccessKey}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(dateStamp)
  )
  
  const kRegion = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(region)
  )
  
  const kService = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(service)
  )
  
  const kSigning = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode('aws4_request')
  )
  
  return new Uint8Array(kSigning)
}

serve(async (req) => {
  console.log('Function started, method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Parsing request body...')
    const body = await req.json()
    console.log('Request body:', body)
    
    const {
      dir = 'wallez',
      filename,
      contentType = 'application/octet-stream',
    } = body

    console.log('Getting environment variables...')
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const region = Deno.env.get('AWS_S3_REGION')
    const bucket = Deno.env.get('AWS_S3_BUCKET')
    const cloudfront = Deno.env.get('CLOUDFRONT_DOMAIN')
    const pattern = Deno.env.get('IMAGE_TRANSFORM_PATTERN') || '/fit-in/{w}x{h}/'

    console.log('Environment variables check:', {
      accessKeyId: accessKeyId ? 'SET' : 'MISSING',
      secretAccessKey: secretAccessKey ? 'SET' : 'MISSING',
      region: region || 'MISSING',
      bucket: bucket || 'MISSING',
      cloudfront: cloudfront || 'MISSING',
      pattern
    })

    if (!accessKeyId) {
      console.error('AWS_ACCESS_KEY_ID is missing')
      return new Response(JSON.stringify({ error: 'AWS_ACCESS_KEY_ID is missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }
    if (!secretAccessKey) {
      console.error('AWS_SECRET_ACCESS_KEY is missing')
      return new Response(JSON.stringify({ error: 'AWS_SECRET_ACCESS_KEY is missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }
    if (!region) {
      console.error('AWS_S3_REGION is missing')
      return new Response(JSON.stringify({ error: 'AWS_S3_REGION is missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }
    if (!bucket) {
      console.error('AWS_S3_BUCKET is missing')
      return new Response(JSON.stringify({ error: 'AWS_S3_BUCKET is missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }
    if (!cloudfront) {
      console.error('CLOUDFRONT_DOMAIN is missing')
      return new Response(JSON.stringify({ error: 'CLOUDFRONT_DOMAIN is missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }
    
    if (!filename) {
      console.error('filename is missing')
      return new Response(JSON.stringify({ error: 'filename is missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }

    console.log('Generating presigned URL manually...')
    
    // Generate key using original filename (cleaned)
    const cleanDir = String(dir).replace(/^\/+|\/+$/g, '')
    
    // Clean the filename to remove special characters and spaces
    const cleanFilename = filename ? filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase() : 'wallpaper'
    
    // Ensure we have a proper extension
    const hasExtension = cleanFilename.includes('.')
    const extFromType = contentType === 'image/png' ? '.png' : 
                       contentType === 'image/webp' ? '.webp' : 
                       contentType === 'image/jpeg' ? '.jpg' : 
                       contentType === 'image/jpg' ? '.jpg' : ''
    
    const finalFilename = hasExtension ? cleanFilename : `${cleanFilename}${extFromType || '.jpg'}`
    const key = `${cleanDir}/${finalFilename}`
    
    console.log('Generated key:', key)

    // Check if file already exists
    console.log('Checking if file already exists...')
    const fileExists = await checkFileExists(accessKeyId, secretAccessKey, region, bucket, key)
    
    if (fileExists) {
      console.log('File already exists:', key)
      const publicUrl = `https://${cloudfront}/${key}`
      const thumbnailTemplate = `https://${cloudfront}${pattern}${key}`
      
      return new Response(
        JSON.stringify({ 
          fileExists: true,
          key, 
          publicUrl, 
          thumbnailTemplate,
          message: 'File already exists, skipping upload'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('File does not exist, creating presigned URL...')
    const uploadUrl = await createPresignedUrl(
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      key,
      contentType,
      300 // 5 minutes
    )

    const publicUrl = `https://${cloudfront}/${key}`
    const thumbnailTemplate = `https://${cloudfront}${pattern}${key}`
    
    // Also provide direct S3 URL as fallback
    const s3DirectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`
    
    // Generate presigned read URL for testing (expires in 1 hour)
    const presignedReadUrl = await createPresignedReadUrl(
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      key,
      3600
    )

    console.log('Generated URLs successfully:', {
      uploadUrl: uploadUrl.substring(0, 100) + '...', // Truncate for security
      publicUrl,
      thumbnailTemplate,
      s3DirectUrl,
      presignedReadUrl: presignedReadUrl.substring(0, 100) + '...', // Truncate for security
      key
    })

    return new Response(
      JSON.stringify({ 
        uploadUrl, 
        key, 
        publicUrl, 
        thumbnailTemplate,
        s3DirectUrl, // Include direct S3 URL for debugging
        presignedReadUrl // Include presigned read URL for testing
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (e) {
    console.error('s3-presign-upload error:', e)
    const err = e as Error
    return new Response(
      JSON.stringify({ error: 'Unexpected error', name: err.name, message: err.message, stack: err.stack }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})