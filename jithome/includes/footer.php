  </div><!-- end .app-main -->

  <!-- ═══ BOTTOM NAV (mobile) ════════════════════════════════ -->
  <nav class="bottom-nav">
    <?php foreach ($navItems as $n): ?>
    <a href="?page=<?= $n['id'] ?>" class="nav-item <?= $page === $n['id'] ? 'active' : '' ?>">
      <?= navIcon($n['icon']) ?>
      <span><?= $n['label'] ?></span>
    </a>
    <?php endforeach; ?>
  </nav>

</div><!-- end #root -->

<!-- ═══ PATIENT MODAL ══════════════════════════════════════════ -->
<div id="modal-overlay" class="modal-overlay" style="display:none" onclick="if(event.target===this)closeModal()">
  <div class="modal-sheet fade-up" id="modal-sheet">
    <div class="modal-handle"></div>
    <div id="modal-content"><!-- filled by JS --></div>
  </div>
</div>

<!-- ═══ VISIT FORM MODAL ════════════════════════════════════════ -->
<div id="visit-overlay" class="modal-overlay" style="display:none" onclick="if(event.target===this)closeVisitModal()">
  <div class="modal-sheet fade-up" style="max-height:92vh">
    <div class="modal-handle"></div>
    <div id="visit-content"><!-- filled by JS --></div>
  </div>
</div>

<script src="/assets/app.js"></script>
</body>
</html>
