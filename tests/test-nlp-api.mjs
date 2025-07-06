// Simple API test script for NLP extraction (ES Module version)

async function testNLPExtraction() {
  const videoUrl = 'https://youtu.be/HKYkhkYGG7A';
  const apiUrl = `http://localhost:8000/api/v1/youtube/extract-vocabulary?url=${encodeURIComponent(videoUrl)}`;
  
  console.log('Testing NLP extraction...');
  console.log('Video URL:', videoUrl);
  console.log('API URL:', apiUrl);
  console.log('---');
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n=== Analysis ===');
      console.log('Video ID:', data.video_id);
      console.log('Vocabulary Count:', data.vocabulary_count);
      console.log('Extraction Method:', data.data?.extraction_method);
      console.log('Actual Items Length:', data.data?.vocabulary_items?.length || 0);
      
      if (data.data?.vocabulary_items?.length > 0) {
        console.log('\nFirst 3 items:');
        data.data.vocabulary_items.slice(0, 3).forEach((item, idx) => {
          console.log(`${idx + 1}. ${item.english_text || '[no english]'} / ${item.japanese_text || '[no japanese]'}`);
        });
      } else {
        console.log('\nNo vocabulary items found!');
      }
      
      // Check for mismatch
      if (data.vocabulary_count !== data.data?.vocabulary_items?.length) {
        console.log('\n⚠️  WARNING: Mismatch between vocabulary_count and actual items!');
        console.log(`   vocabulary_count: ${data.vocabulary_count}`);
        console.log(`   actual items: ${data.data?.vocabulary_items?.length || 0}`);
      }
    } else {
      console.log('API request failed:', data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testNLPExtraction();