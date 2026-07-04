from sqlmodel import Session, select, func
from app.models import Post


def get_active_feed(session: Session, company_id: int):
    """
    Retorna o feed de posts ativos (filtrado por empresa).
    """
    statement = select(Post).where(Post.company_id == company_id).order_by(Post.id.desc())
    results = session.exec(statement).all()
    print(f"[FEED_SERVICE] get_active_feed(company_id={company_id}) → {len(results)} posts encontrados")
    for p in results:
        print(f"  └─ Post ID={p.id} | company_id={p.company_id} | barber_id={p.barber_id} | image_url={p.image_url[:60]}...")
    return results


def create_new_post(session: Session, company_id: int, barber_id: int, image_url: str, caption: str | None = None):
    """
    Cria uma nova publicação no feed com a imagem já salva no disco.
    """
    print("=" * 60)
    print("[FEED_SERVICE] create_new_post — INÍCIO")
    print(f"  company_id (recebido) = {company_id}")
    print(f"  barber_id  (recebido) = {barber_id}")
    print(f"  caption    (recebido) = {repr(caption)}")
    print(f"  image_url  (recebido) = {image_url}")

    db_post = Post(
        company_id=company_id,
        barber_id=barber_id,
        image_url=image_url,
        caption=caption,
    )

    print(f"\n  >>> ANTES do session.add():")
    print(f"      db_post.id          = {db_post.id}")
    print(f"      db_post.company_id  = {db_post.company_id}")
    print(f"      db_post.barber_id   = {db_post.barber_id}")
    print(f"      db_post.image_url   = {db_post.image_url}")
    print(f"      db_post.caption     = {repr(db_post.caption)}")
    print(f"      db_post.created_at  = {db_post.created_at}")

    session.add(db_post)
    print("\n  >>> session.add() executado. Chamando session.commit()...")
    session.commit()
    print("  >>> session.commit() executado COM SUCESSO")

    print("\n  >>> Chamando session.refresh(db_post)...")
    session.refresh(db_post)

    print(f"\n  >>> DEPOIS do session.commit() + refresh():")
    print(f"      db_post.id          = {db_post.id}")
    print(f"      db_post.company_id  = {db_post.company_id}")
    print(f"      db_post.barber_id   = {db_post.barber_id}")
    print(f"      db_post.image_url   = {db_post.image_url}")
    print(f"      db_post.caption     = {repr(db_post.caption)}")
    print(f"      db_post.created_at  = {db_post.created_at}")

    # --- AUDITORIA PÓS-COMMIT: quantos posts existem para essa empresa? ---
    total = session.exec(
        select(func.count(Post.id)).where(Post.company_id == company_id)
    ).one()
    print(f"\n  >>> AUDITORIA: total de posts na company_id={company_id} AGORA = {total}")
    print("[FEED_SERVICE] create_new_post — FIM")
    print("=" * 60)

    return db_post


def delete_post(session: Session, company_id: int, post_id: int) -> bool:
    """
    Deleta uma publicação do feed pelo ID (com isolamento de empresa).
    Retorna True se deletou, False se não encontrou.
    """
    post = session.exec(
        select(Post).where(Post.id == post_id, Post.company_id == company_id)
    ).first()
    if not post:
        return False
    session.delete(post)
    session.commit()
    return True

    
