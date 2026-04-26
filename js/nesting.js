/* Card Nesting — shared helpers
   Loaded by every iframe page so link/unlink logic lives in one place. */

// ── HTML escaping ───────────────────────────────────────

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Plugin data access ──────────────────────────────────

function getPluginData(t, cardId) {
  return t.get(cardId, 'shared', 'nesting').then(function (data) {
    return data || {};
  });
}

function setPluginData(t, cardId, data) {
  return t.set(cardId, 'shared', 'nesting', data);
}

function getCurrentCardData(t) {
  return t.card('id').then(function (card) {
    return getPluginData(t, card.id).then(function (data) {
      return { id: card.id, data: data };
    });
  });
}

// ── Stale reference pruning ─────────────────────────────

function pruneStaleChildren(t, cardId, data) {
  if (!data.isParent || !data.childIds || data.childIds.length === 0) {
    return Promise.resolve(data);
  }
  return t.cards('id').then(function (boardCards) {
    var boardIds = boardCards.map(function (c) { return c.id; });
    var clean = data.childIds.filter(function (id) {
      return boardIds.indexOf(id) > -1;
    });
    if (clean.length === data.childIds.length) return data;
    data.childIds = clean;
    if (clean.length === 0) data.isParent = false;
    return setPluginData(t, cardId, data).then(function () {
      return data;
    });
  });
}

// ── Validation ──────────────────────────────────────────

function validateCanBeChild(t, childId) {
  return getPluginData(t, childId).then(function (childData) {
    if (childData.isParent && childData.childIds && childData.childIds.length > 0) {
      return { ok: false, reason: 'That card is a parent with children. Cards can only nest one level deep.' };
    }
    return { ok: true, existingParentId: childData.parentId || null };
  });
}

function validateCanBeParent(t, parentId) {
  return getPluginData(t, parentId).then(function (parentData) {
    if (parentData.isChild) {
      return { ok: false, reason: 'That card is already a child. Cards can only nest one level deep.' };
    }
    return { ok: true };
  });
}

// ── Core operations ─────────────────────────────────────

function linkChild(t, parentId, childId) {
  return validateCanBeParent(t, parentId).then(function (pv) {
    if (!pv.ok) return { ok: false, reason: pv.reason };
    return validateCanBeChild(t, childId).then(function (cv) {
      if (!cv.ok) return { ok: false, reason: cv.reason };

      var cleanupOldParent = Promise.resolve();
      if (cv.existingParentId && cv.existingParentId !== parentId) {
        cleanupOldParent = getPluginData(t, cv.existingParentId).then(function (oldParent) {
          oldParent.childIds = (oldParent.childIds || []).filter(function (id) { return id !== childId; });
          if (oldParent.childIds.length === 0) oldParent.isParent = false;
          return setPluginData(t, cv.existingParentId, oldParent);
        });
      }

      return cleanupOldParent.then(function () {
        return getPluginData(t, parentId).then(function (parentData) {
          var children = parentData.childIds || [];
          if (children.indexOf(childId) === -1) children.push(childId);
          parentData.childIds = children;
          parentData.isParent = true;
          return setPluginData(t, parentId, parentData);
        });
      }).then(function () {
        return getPluginData(t, childId).then(function (childData) {
          childData.parentId = parentId;
          childData.isChild = true;
          childData.isParent = false;
          childData.childIds = [];
          return setPluginData(t, childId, childData);
        });
      }).then(function () {
        return { ok: true };
      });
    });
  });
}

function unlinkChild(t, parentId, childId) {
  return getPluginData(t, parentId).then(function (parentData) {
    var children = parentData.childIds || [];
    var idx = children.indexOf(childId);
    if (idx > -1) children.splice(idx, 1);
    parentData.childIds = children;
    if (children.length === 0) parentData.isParent = false;
    return setPluginData(t, parentId, parentData);
  }).then(function () {
    return getPluginData(t, childId).then(function (childData) {
      childData.parentId = null;
      childData.isChild = false;
      return setPluginData(t, childId, childData);
    });
  });
}
