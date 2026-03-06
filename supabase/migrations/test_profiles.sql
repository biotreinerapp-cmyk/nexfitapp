-- Test querying the profile of the active binding
SELECT 
    b.student_id,
    p.nome,
    p.display_name,
    p.email
FROM professional_student_bindings b
JOIN profiles p ON p.id = b.student_id
WHERE b.status = 'active';

-- Also check chat rooms
SELECT 
    r.student_id,
    p.nome,
    p.display_name,
    p.email
FROM professional_chat_rooms r
JOIN profiles p ON p.id = r.student_id;
