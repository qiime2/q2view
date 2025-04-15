<script lang="ts">
  const downloadChrome = 'https://www.google.com/chrome/browser/';
  const downloadFirefox = 'https://www.mozilla.org/firefox';
</script>

<div class="container" style="text-align: center">
  <h1>Incompatible Browser</h1>
  <div  class="row" style="margin-bottom: 50px;">
    <div class="col-md-12">
      Sorry, your current browser does not support the latest web-technologies
      that this site needs.
    </div>
  </div>
  <div class="row show-grid">
    <div class="col-md-6 col-md-push-6" style="margin-bottom: 4em;">
      <a href={downloadFirefox}><img src="/images/firefox.png" alt="Firefox" /></a>
      <h3>
        Download <strong><a href={downloadFirefox}>Mozilla Firefox&reg;</a></strong>
      </h3>
      <p>(requires version 47 or later;<br />will not work in private browsing)</p>
    </div>
  <div class="col-md-6 col-md-pull-6">
    <a href={downloadChrome}><img src="/images/chrome.png" alt="Chrome" /></a>
    <h3>
        Download <strong><a href={downloadChrome}>Google Chrome&reg;</a></strong>
    </h3>
    <p>(requires version 49 or later)</p>
    </div>
  </div>
</div>
