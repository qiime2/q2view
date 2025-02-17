<script lang='ts'>
    export let autohide = false;
</script>
<header class="header" class:autohide>
  <div class="contents max-width">
    <nav class="title">
      <a href="https://qiime2.org"><h2>QIIME 2</h2></a>
    </nav>
    <nav class="links">
      <ul>
          <li><a href="https://library.qiime2.org">Library</a></li>
          <li><a href="https://view.qiime2.org">View</a></li>
          <li><a href="https://forum.qiime2.org">Forum</a></li>
      </ul>
    </nav>
  </div>
</header>

<style lang="postcss">
  .autohide {
    margin-top: -25px;
    transition: margin-top ease-in-out .25s;
  }

  .autohide:hover {
    margin-top: 0px;
    transition: margin-top ease-in-out .25s;
  }

  .header {
    font-weight: bold;
    width: 100%;
    background-color: #1a414c;
    line-height: 1.25em;
    margin-bottom: 0;
    scrollbar-gutter: stable;
    overflow: hidden;
    height: 30px;
  }

  h2 {
    font-size: 18px;
    line-height: 1.75em;
  }

  .contents {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    position: relative;
    padding: 0 0.67em;
  }

  .title {
    margin-right: 2em;
    margin-left: .3em;
  }

  .links {
    overflow: hidden;
    margin-left: auto;
    padding-right: .2em;
  }

  a {
    color: white;
    text-decoration: none;
  }

  a:hover, a:active {
    text-decoration: underline;
  }

  ul {
    font-size: 14px;
    gap: 2em;
    margin: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    min-height: 30px;
  }

  ul > li {
    display: flex;
    align-items: center;
    font-size: 14px;
  }

</style>