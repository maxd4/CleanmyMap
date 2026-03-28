def trace_mojibake(c, steps=5):
    history = [c]
    for _ in range(steps):
        try:
            c = c.encode('utf-8').decode('cp1252')
            history.append(c)
        except Exception:
            break
    return history

print("é ->", trace_mojibake('é'))
print("à ->", trace_mojibake('à'))
print("è ->", trace_mojibake('è'))
