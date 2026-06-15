import zlib, struct, math, os

OUT = "/Users/ashik/Codes/tryout-apps/chrome-extension-visbug/icons"
os.makedirs(OUT, exist_ok=True)

def lerp(a, b, t): return a + (b - a) * t

# gradient endpoints
C0 = (91, 141, 239)   # #5b8def
C1 = (255, 59, 123)   # #ff3b7b

def render(size, ss=4):
    S = size * ss
    px = [[(0,0,0,0)]*S for _ in range(S)]
    r = 0.22 * S          # corner radius
    cx = cy = S/2
    R_out = 0.31 * S      # ring outer
    R_in  = 0.225 * S     # ring inner
    R_dot = 0.105 * S     # center dot
    for y in range(S):
        for x in range(S):
            # rounded-rect mask
            dx = max(r - x, x - (S - r), 0)
            dy = max(r - y, y - (S - r), 0)
            if math.hypot(dx, dy) > r:
                continue
            t = (x + y) / (2 * S)
            rr = int(lerp(C0[0], C1[0], t))
            gg = int(lerp(C0[1], C1[1], t))
            bb = int(lerp(C0[2], C1[2], t))
            d = math.hypot(x - cx, y - cy)
            if (R_in <= d <= R_out) or (d <= R_dot):
                rr = gg = bb = 255
            px[y][x] = (rr, gg, bb, 255)
    # downsample (box average)
    out = bytearray()
    for oy in range(size):
        out.append(0)  # filter
        for ox in range(size):
            R=G=B=A=0
            for j in range(ss):
                for i in range(ss):
                    p = px[oy*ss+j][ox*ss+i]
                    R+=p[0]*p[3]; G+=p[1]*p[3]; B+=p[2]*p[3]; A+=p[3]
                    j=j
            n = ss*ss
            a = A//n
            if a == 0:
                out += bytes([0,0,0,0])
            else:
                out += bytes([R//A, G//A, B//A, a])
    return bytes(out)

def write_png(path, size):
    raw = render(size)
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + \
          chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, size, "x", size)

for s in (16, 32, 48, 64, 128):
    write_png(f"{OUT}/icon{s}.png", s)
