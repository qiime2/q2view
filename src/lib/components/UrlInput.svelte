<script lang="ts">
  import { preventDefault } from 'svelte/legacy';

  let inputMode = $state(0);

  function resolveURL() {
    const inputElement = document.getElementById("URLInput") as HTMLInputElement;

    // This shouldn"t happen. If the user is able to click the button a URLInput
    if (inputElement === null) {
      alert("Something went wrong, please refresh the page and try again.");
    } else {
      let inputURL = inputElement.value;

      if (inputURL) {
        inputMode = 0;
        history.pushState({}, "", "/?src="+inputURL);
      }
    }
  }
</script>


<form>
  <div style="text-align: center" class="py-4">
    {#if inputMode === 0}
      <p>
        You can also provide a link to
        a <a href="#/" onclick={preventDefault(() => {inputMode = 1})} role="button" >
          file on Dropbox</a>,
        a <a href="#/" onclick={preventDefault(() => {inputMode = 2})} role="button" >
          file on Zenodo</a>, or
        a <a href="#/" onclick={preventDefault(() => {inputMode = 3})} role="button">
          file from the web</a>.
      </p>
    {:else}
      <div id="input">
        <button id="cancel-button" type="button" onclick={() => {inputMode = 0}}>cancel</button>
        {#if inputMode === 1}
          <input id="URLInput" placeholder="Shared link to a .qza/.qzv file on Dropbox" />
        {:else if inputMode === 2}
          <input id="URLInput" placeholder="Shared link to a .qza/.qzv file on Zenodo" />
        {:else if inputMode === 3}
          <input id="URLInput" placeholder="URL to a .qza/.qzv file on the web" />
        {/if}
        <button id="submit-button" type="submit" onclick={() => resolveURL()}>Go!</button>
      </div>
    {/if}
  </div>
  {#if inputMode === 1}
    <div class="pb-4">
      <h3>
        Dropbox Instructions:
      </h3>
      <ol class="pl-10" style="list-style: decimal">
        <li>
          Find the file you would like to share.
        </li>
        <li>
          Create a shared link to it.
        </li>
        <li>
          Provide that link in the input form above and hit "Go!"
        </li>
      </ol>
    </div>
  {:else if inputMode === 2}
    <div class="pb-4">
      <h3>
        Zenodo Instructions:
      </h3>
      <ol class="pl-10" style="list-style: decimal">
        <li>
          Find the file you would like on Zenodo.
        </li>
        <li>
          Get its download link.
        </li>
        <li>
          Provide that link in the input form above and hit "Go!"
        </li>
      </ol>
    </div>
  {:else if inputMode === 3}
    <div class="grid lg:grid-cols-2 pb-4">
      <div>
        <h3>
          Web URL Instructions:
        </h3>
        <p>Provide a link to your file in the input form above and hit "Go!"</p>
        <p>Note: the server that is hosting your file must support CORS. See Required Headers for more information.</p>
      </div>
      <div>
        <h3>
          Known Supported Websites:
        </h3>
        <ul class="pl-10" style="list-style: disc">
          <li>
            docs.qiime2.org
          </li>
          <li>
            forum.qiime2.org
          </li>
          <li>
            websites hosted on Github Pages
          </li>
          <li>
            &lt;your webserver here&gt; (see Required Headers)
          </li>
        </ul>
      </div>
    </div>
  {/if}
</form>

<style lang="postcss">
  #input {
    font-size: 20px;
    height: 50px;
    @apply flex;
  }

  #cancel-button {
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    @apply border
    border-gray-300
    bg-gray-100
    mr-auto
    px-2;
  }

  #cancel-button:hover {
    @apply border
    border-gray-400
    bg-gray-300;
  }

  #URLInput {
    border-top: 1px solid;
    border-bottom: 1px solid;
    @apply border-gray-300
    w-full
    px-2;
  }

  #URLInput:focus {
    z-index: 2;
    outline: 1px solid;
    margin: 1px 0px;
    box-shadow: 0px 0px 5px rgb(59, 130, 246);
    @apply border-none
    outline-blue-400
    w-full
    px-2
  }

  #submit-button {
    color: white;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    @apply border
    border-blue-800
    bg-blue-700
    ml-auto
    px-2
  }

  #submit-button:hover {
    @apply border
    border-blue-900
    bg-blue-800;
  }
</style>
