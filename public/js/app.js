function deleteEntry (groupId, Uuid) {
  if (confirm('Really delete')) {
    window.location = `delete/${groupId}/${Uuid}`;
  }
}
